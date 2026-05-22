import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const REGISTRY_OUT_DIR = join(WEB_DIR, "public/catalogs");

const REGISTRY_SPEC_VERSION = "1.0.0";
const REGISTRY_ATOM_TYPE = "atoms.convergent-systems.co/catalogs";

const BOOTSTRAP_HEADER = `# BOOTSTRAP: pre-keygen. Per Part IX §40, every atom MUST be signed.
# The atoms.convergent-systems.co root key has not been minted yet, so
# authored_by and [signatures] carry "bootstrap-pending" placeholders.
# These entries become spec-conformant when signing is wired up.
`;

async function discoverCatalogs() {
  const gitmodulesPath = join(REPO_DIR, ".gitmodules");
  if (!existsSync(gitmodulesPath)) return [];
  const text = await readFile(gitmodulesPath, "utf-8");
  const paths = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*path\s*=\s*(.+?)\s*$/);
    if (m) paths.push(m[1]);
  }
  return paths.filter((p) => existsSync(join(REPO_DIR, p, "ATOMS.yml")));
}

async function readAtoms(submodulePath) {
  const yamlPath = join(REPO_DIR, submodulePath, "ATOMS.yml");
  const text = await readFile(yamlPath, "utf-8");
  return parseYaml(text);
}

function tomlString(s) {
  if (s === undefined || s === null) return null;
  const text = String(s);
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ").trim()}"`;
}

function tomlStringArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "[]";
  return "[" + arr.map((v) => tomlString(v)).join(", ") + "]";
}

function renderCatalogToml(yaml, builtAt) {
  const name = yaml.name ?? "unknown";
  const version = yaml.version ?? "0.0.0";
  const lines = [
    BOOTSTRAP_HEADER.trimEnd(),
    "",
    `spec_version = "${REGISTRY_SPEC_VERSION}"`,
    `canonical_name = "atoms.convergent-systems.co/catalogs/${name}"`,
    `version = "${version}"`,
    `atom_type = "${REGISTRY_ATOM_TYPE}"`,
    `authored_by = "ed25519:bootstrap-pending"`,
    `created_at = "${builtAt}"`,
    "",
    "[signatures]",
    "# pending — see bootstrap header",
    "",
    "[body]",
    `catalog_name = ${tomlString(name)}`,
    `catalog_version = ${tomlString(version)}`,
    `canonical_domain = ${tomlString(yaml.domain)}`,
    `implements_spec = ${tomlString(yaml.spec)}`,
    `purpose = ${tomlString(yaml.purpose)}`,
    `atom_types = ${tomlStringArray(yaml.atomTypes)}`,
    `composition_type = ${tomlString(yaml.compositionType)}`,
    `composition_dir = ${tomlString(yaml.compositionDir)}`,
    `rule_types = ${tomlStringArray(yaml.ruleTypes)}`,
    `runtime_consumers = ${tomlStringArray(yaml.runtimeConsumers)}`,
    `license = ${tomlString(yaml.license)}`,
    `pages_url = ${tomlString(`https://${name}.pages.dev`)}`,
    `github_url = ${tomlString(`https://github.com/convergent-systems-co/${name}`)}`,
  ];
  if (yaml.ecosystem?.federation) {
    lines.push(`federation = ${tomlString(yaml.ecosystem.federation)}`);
  }
  return lines.join("\n") + "\n";
}

function renderIndexToml(entries, builtAt) {
  const lines = [
    "# Index of registered catalogs.",
    `built_at = "${builtAt}"`,
    `total = ${entries.length}`,
    "",
  ];
  for (const e of entries) {
    lines.push("[[catalogs]]");
    lines.push(`name = ${tomlString(e.name)}`);
    lines.push(`version = ${tomlString(e.version)}`);
    lines.push(`canonical_domain = ${tomlString(e.domain)}`);
    lines.push(`url = "/catalogs/${e.name}.toml"`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const catalogs = await discoverCatalogs();
  if (catalogs.length === 0) {
    console.error("no catalogs found via .gitmodules");
    process.exit(1);
  }

  await mkdir(REGISTRY_OUT_DIR, { recursive: true });
  const builtAt = new Date().toISOString();
  const indexEntries = [];

  for (const path of catalogs) {
    const yaml = await readAtoms(path);
    const name = yaml.name ?? path.split("/").pop();
    const toml = renderCatalogToml(yaml, builtAt);
    await writeFile(join(REGISTRY_OUT_DIR, `${name}.toml`), toml);
    indexEntries.push({
      name,
      version: yaml.version,
      domain: yaml.domain,
    });
  }

  await writeFile(
    join(REGISTRY_OUT_DIR, "index.toml"),
    renderIndexToml(indexEntries, builtAt),
  );

  console.log(`wrote ${REGISTRY_OUT_DIR}/{<catalog>.toml × ${indexEntries.length}, index.toml}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
