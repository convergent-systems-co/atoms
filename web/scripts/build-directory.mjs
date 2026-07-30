import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import { parse as parseYaml } from "yaml";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const PUBLIC = join(WEB_DIR, "public");
const OUT_PATH = join(PUBLIC, "directory.json");

// Catalogs are auto-discovered by parsing .gitmodules at the repo root.
// Any submodule whose path holds an ATOMS.yml is treated as a catalog.
// Adding a new catalog = `git submodule add ...`; no code change here.
async function discoverCatalogDirs() {
  const gitmodulesPath = join(REPO_DIR, ".gitmodules");
  if (!existsSync(gitmodulesPath)) return [];
  const text = await readFile(gitmodulesPath, "utf-8");
  const paths = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*path\s*=\s*(.+?)\s*$/);
    if (match) paths.push(match[1]);
  }
  // Only keep submodule paths that contain an ATOMS.yml (i.e., are catalogs).
  return paths.filter((p) => existsSync(join(REPO_DIR, p, "ATOMS.yml")));
}

// Count atom/composition files in the submodule.
// Checks atoms/ (standard) and any extra directories passed in (e.g. brands/, palettes/).
// Works when the submodule is checked out (always true in CI with submodules: recursive).
async function countLocalAtoms(submodulePath, extraDirs = []) {
  const dirsToCheck = ["atoms", ...extraDirs];
  let count = 0;
  for (const dirName of dirsToCheck) {
    const dir = join(REPO_DIR, submodulePath, dirName);
    if (!existsSync(dir)) continue;
    try {
      const entries = await readdir(dir, { recursive: true });
      for (const entry of entries) {
        if (entry.endsWith(".json") || entry.endsWith(".toml")) {
          const full = join(dir, entry);
          if ((await stat(full)).isFile()) count++;
        }
      }
    } catch { /* submodule not initialized */ }
  }
  return count;
}

const FETCH_TIMEOUT_MS = 5000;

// Check if the site apex (root URL) is reachable — proves the CF Pages project is deployed.
async function checkApexLive(catalogName, domain) {
  const urls = [
    domain ? `https://${domain}/` : null,
    `https://${catalogName}.pages.dev/`,
  ].filter(Boolean);
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, method: "HEAD" });
      if (res.ok) return true;
    } catch { /* offline */ } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

async function fetchLive(catalogName, domain) {
  // Try canonical domain first, fall back to pages.dev subdomain.
  const urls = [
    domain ? `https://${domain}/exports/catalog.json` : null,
    `https://${catalogName}.pages.dev/exports/catalog.json`,
  ].filter(Boolean);

  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) continue;
      // Some CF Pages sites return HTML with 200 (SPA fallback) when the file is missing.
      // Only parse if the response is actually JSON.
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json") && !ct.includes("text/plain")) continue;
      const data = await res.json();
      return {
        catalog_url: url,
        atoms: Array.isArray(data.atoms) ? data.atoms.length : 0,
        compositions: Array.isArray(data.compositions) ? data.compositions.length : 0,
        rules: Array.isArray(data.rules) ? data.rules.length : 0,
        built_at: data.built_at ?? null,
      };
    } catch {
      // try next URL
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function readCatalog(submodulePath) {
  const yamPath = join(REPO_DIR, submodulePath, "ATOMS.yml");
  if (!existsSync(yamPath)) {
    return { name: basename(submodulePath), status: "missing", error: "ATOMS.yml not found" };
  }
  const text = await readFile(yamPath, "utf-8");
  let yaml;
  try {
    yaml = parseYaml(text);
  } catch (e) {
    return { name: basename(submodulePath), status: "invalid", error: String(e) };
  }

  // yaml fields use snake_case — match ATOMS.yml exactly
  const catalogName = yaml.name ?? basename(submodulePath);
  const domain = yaml.canonical_domain ?? yaml.domain ?? null;
  const atomTypes = Array.isArray(yaml.atom_types) ? yaml.atom_types : [];

  // Some catalogs (brand-atoms) store files in composition_dir (brands/, palettes/, fonts/)
  // rather than atoms/. Count from both.
  const compositionDirName = yaml.composition_dir ?? null;
  const extraDirs = compositionDirName ? [compositionDirName] : [];

  const [live, localAtomCount, apexLive] = await Promise.all([
    fetchLive(catalogName, domain),
    countLocalAtoms(submodulePath, extraDirs),
    checkApexLive(catalogName, domain),
  ]);

  // A catalog is "live" if:
  //   - exports/catalog.json returned valid JSON (live != null), OR
  //   - The site apex is reachable (CF Pages is deployed, regardless of catalog path convention)
  // "bootstrap" is reserved for sites with no deployment at all.
  const isLive = live != null || apexLive;

  return {
    name: catalogName,
    version: yaml.version ?? null,
    status: isLive ? "live" : "bootstrap",
    domain,
    pages_url: `https://${catalogName}.pages.dev`,
    github_url: `https://github.com/convergent-systems-co/${catalogName}`,
    ai_endpoint: domain ? `https://${domain}/ai/index.json` : null,
    federation: yaml.federation ?? yaml.ecosystem?.federation ?? null,
    description: typeof yaml.description === "string" ? yaml.description.trim() : null,
    purpose: typeof yaml.purpose === "string" ? yaml.purpose.trim() : null,
    atom_types: atomTypes,
    composition_type: yaml.composition_type ?? null,
    composition_dir: yaml.composition_dir ?? null,
    rule_types: Array.isArray(yaml.rule_types) ? yaml.rule_types : [],
    runtime_consumers: Array.isArray(yaml.runtime_consumers) ? yaml.runtime_consumers : [],
    license: yaml.licensing?.code ?? yaml.license ?? null,
    local_atoms: localAtomCount,
    live,
  };
}

async function main() {
  const catalogDirs = await discoverCatalogDirs();
  console.log(`Building directory.json from ${catalogDirs.length} catalogs…`);
  const catalogs = await Promise.all(catalogDirs.map(readCatalog));

  const live_count = catalogs.filter((c) => c.status === "live").length;
  const bootstrap_count = catalogs.filter((c) => c.status === "bootstrap").length;

  const directory = {
    ecosystem: "convergent-systems",
    spec: "atoms-spec/v1",
    built_at: new Date().toISOString(),
    summary: {
      total: catalogs.length,
      live: live_count,
      bootstrap: bootstrap_count,
    },
    catalogs,
  };

  await mkdir(PUBLIC, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(directory, null, 2) + "\n", "utf-8");
  console.log(`wrote ${OUT_PATH}`);
  console.log(`  ${catalogs.length} catalogs (${live_count} live, ${bootstrap_count} bootstrap)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
