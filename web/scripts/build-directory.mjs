import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const PUBLIC = join(WEB_DIR, "public");
const OUT_PATH = join(PUBLIC, "directory.json");

// Each catalog is a submodule directory at the repo root containing ATOMS.yml.
const CATALOG_DIRS = [
  "agent-atoms",
  "brand-atoms",
  "compliance-atoms",
  "event-atoms",
  "identity-atoms",
  "knowledge-atoms",
  "persona-atoms",
  "plugin-atoms",
  "policy-atoms",
  "prompt-atoms",
  "service-atoms",
  "theme-atoms",
  "workflow-atoms",
];

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
  console.log(`Building directory.json from ${CATALOG_DIRS.length} catalogs…`);
  const catalogs = await Promise.all(CATALOG_DIRS.map(readCatalog));

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
