import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
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

const FETCH_TIMEOUT_MS = 5000;

async function fetchLive(catalogName) {
  // pages.dev subdomain matches catalog name.
  const url = `https://${catalogName}.pages.dev/exports/catalog.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      catalog_url: url,
      atoms: Array.isArray(data.atoms) ? data.atoms.length : 0,
      compositions: Array.isArray(data.compositions) ? data.compositions.length : 0,
      rules: Array.isArray(data.rules) ? data.rules.length : 0,
      built_at: data.built_at ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readCatalog(name) {
  const path = join(REPO_DIR, name, "ATOMS.yml");
  if (!existsSync(path)) {
    return { name, status: "missing", error: "ATOMS.yml not found" };
  }
  const text = await readFile(path, "utf-8");
  let yaml;
  try {
    yaml = parseYaml(text);
  } catch (e) {
    return { name, status: "invalid", error: String(e) };
  }
  const live = await fetchLive(name);
  return {
    name: yaml.name ?? name,
    version: yaml.version ?? null,
    status: live ? "live" : "bootstrap",
    domain: yaml.domain ?? null,
    pages_url: `https://${name}.pages.dev`,
    github_url: `https://github.com/convergent-systems-co/${name}`,
    federation: yaml.ecosystem?.federation ?? null,
    purpose: typeof yaml.purpose === "string" ? yaml.purpose.trim() : null,
    atom_types: Array.isArray(yaml.atomTypes) ? yaml.atomTypes : [],
    composition_type: yaml.compositionType ?? null,
    composition_dir: yaml.compositionDir ?? null,
    rule_types: Array.isArray(yaml.ruleTypes) ? yaml.ruleTypes : [],
    runtime_consumers: Array.isArray(yaml.runtimeConsumers) ? yaml.runtimeConsumers : [],
    license: yaml.license ?? null,
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
