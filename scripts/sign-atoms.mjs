#!/usr/bin/env node
// Sign the atoms.convergent-systems.co spec, catalog registry, and key record.
//
// Reads:
//   - spec/atom-spec.md           — canonical Spec markdown
//   - src/<catalog>/ATOMS.yml × N — catalog manifests (discovered from .gitmodules)
//   - root key from 1Password     — Convergent Systems LLC / atoms-root
//
// Writes (committed):
//   - spec/atom-spec.toml + spec/atom-spec@<version>.toml + spec/index.toml
//   - catalogs/<id>.toml × N + catalogs/index.toml
//   - keys/root.toml + keys/index.toml + keys.toml
//
// Bootstrap caveat: first signing run uses now() for created_at on every atom.
// Subsequent runs should preserve created_at when content is unchanged to honor
// Spec §2 immutability — TODO when re-signing flow is needed.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import { canonicalize, renderFinal } from "./lib/canonical-toml.mjs";
import { rootKey, signCanonicalHash, verifySignature } from "./lib/sign-ed25519.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

const SPEC_VERSION = "1.0.0";
const REGISTRY_VERSION = "1.0.0";
const KEY_RECORD_VERSION = "1.0.0";
const KEYS_REGISTRY_VERSION = "1.0.0";

async function main() {
  const key = rootKey();
  const builtAt = new Date().toISOString();

  await mkdir(join(REPO, "spec"), { recursive: true });
  await mkdir(join(REPO, "catalogs"), { recursive: true });
  await mkdir(join(REPO, "keys"), { recursive: true });

  const counts = { spec: 0, catalogs: 0, keys: 0, indices: 0 };

  // 1. Spec atom
  const specMd = await readFile(join(REPO, "spec/atom-spec.md"), "utf-8");
  const specAtom = {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/spec/atom-spec",
    version: SPEC_VERSION,
    atom_type: "atoms.convergent-systems.co/spec",
    authored_by: key.keyId,
    created_at: builtAt,
    body: {
      title: "The Atom Spec",
      status: `v${SPEC_VERSION} — Constitutional design for the *-atoms ecosystem`,
      markdown_url: "/spec/atom-spec.md",
      markdown: specMd,
    },
  };
  await writeSignedAtom(join(REPO, "spec/atom-spec.toml"), specAtom);
  await writeSignedAtom(join(REPO, `spec/atom-spec@${SPEC_VERSION}.toml`), specAtom);
  counts.spec += 2;

  // Spec version index
  const specIndex = buildSpecIndex(builtAt);
  await writeSignedAtom(join(REPO, "spec/index.toml"), specIndex);
  counts.indices += 1;

  // 2. Catalog registry atoms
  const catalogs = await discoverCatalogs();
  const registryEntries = [];
  for (const path of catalogs) {
    const yamlText = await readFile(join(REPO, path, "ATOMS.yml"), "utf-8");
    const yaml = parseYaml(yamlText);
    const name = yaml.name ?? path.split("/").pop();
    const atom = buildCatalogAtom(name, yaml, builtAt, key.keyId);
    await writeSignedAtom(join(REPO, `catalogs/${name}.toml`), atom);
    registryEntries.push({ name, version: yaml.version, domain: yaml.domain ?? `${name}.com` });
    counts.catalogs += 1;
  }
  const registryIndex = buildCatalogIndex(registryEntries, builtAt, key.keyId);
  await writeSignedAtom(join(REPO, "catalogs/index.toml"), registryIndex);
  counts.indices += 1;

  // 3. Root key record + keys.toml
  const keyRecord = buildKeyRecord(key, builtAt);
  await writeSignedAtom(join(REPO, "keys/root.toml"), keyRecord);
  counts.keys += 1;

  const keysIndex = buildKeysIndex(key, builtAt);
  await writeSignedAtom(join(REPO, "keys/index.toml"), keysIndex);
  counts.indices += 1;

  const keysToml = buildKeysRegistry(key, builtAt);
  await writeSignedAtom(join(REPO, "keys.toml"), keysToml);
  counts.indices += 1;

  console.log(
    `signed: ${counts.spec} spec + ${counts.catalogs} catalog entries + ` +
      `${counts.keys} key record + ${counts.indices} indices = ` +
      `${counts.spec + counts.catalogs + counts.keys + counts.indices} files`,
  );
  console.log(`root key: ${key.keyId}`);
}

async function discoverCatalogs() {
  const gm = await readFile(join(REPO, ".gitmodules"), "utf-8");
  const paths = [];
  for (const line of gm.split("\n")) {
    const m = line.match(/^\s*path\s*=\s*(.+?)\s*$/);
    if (m) paths.push(m[1]);
  }
  return paths.filter((p) => existsSync(join(REPO, p, "ATOMS.yml")));
}

function buildCatalogAtom(name, yaml, createdAt, keyId) {
  const body = {
    catalog_name: name,
    catalog_version: yaml.version ?? "0.0.0",
    canonical_domain: yaml.domain ?? `${name}.com`,
    implements_spec: yaml.spec ?? "atoms-spec/v1",
    license: yaml.license ?? "Apache-2.0",
    pages_url: `https://${name}.pages.dev`,
    github_url: `https://github.com/convergent-systems-co/${name}`,
    atom_types: Array.isArray(yaml.atomTypes) ? yaml.atomTypes : [],
    rule_types: Array.isArray(yaml.ruleTypes) ? yaml.ruleTypes : [],
    runtime_consumers: Array.isArray(yaml.runtimeConsumers) ? yaml.runtimeConsumers : [],
  };
  if (yaml.purpose) body.purpose = String(yaml.purpose).trim();
  if (yaml.compositionType) body.composition_type = yaml.compositionType;
  if (yaml.compositionDir) body.composition_dir = yaml.compositionDir;
  if (yaml.ecosystem?.federation) body.federation = yaml.ecosystem.federation;
  return {
    spec_version: SPEC_VERSION,
    canonical_name: `atoms.convergent-systems.co/catalogs/${name}`,
    version: String(yaml.version ?? "0.0.0"),
    atom_type: "atoms.convergent-systems.co/catalogs",
    authored_by: keyId,
    created_at: createdAt,
    body,
  };
}

function buildCatalogIndex(entries, createdAt, keyId) {
  return {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/catalogs/index",
    version: REGISTRY_VERSION,
    atom_type: "atoms.convergent-systems.co/class-index",
    authored_by: keyId,
    created_at: createdAt,
    body: {
      class: "catalogs",
      total: entries.length,
      catalogs: entries
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({
          name: e.name,
          version: e.version,
          canonical_domain: e.domain,
          url: `/catalogs/${e.name}.toml`,
        })),
    },
  };
}

function buildSpecIndex(createdAt) {
  return {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/spec/index",
    version: SPEC_VERSION,
    atom_type: "atoms.convergent-systems.co/class-index",
    authored_by: rootKey().keyId,
    created_at: createdAt,
    body: {
      class: "spec",
      versions: [
        {
          version: SPEC_VERSION,
          status: "active",
          toml: `/spec/atom-spec@${SPEC_VERSION}.toml`,
          markdown: `/spec/atom-spec@${SPEC_VERSION}.md`,
          latest_toml: "/spec/atom-spec.toml",
          latest_markdown: "/spec/atom-spec.md",
        },
      ],
    },
  };
}

function buildKeyRecord(key, createdAt) {
  return {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/keys/root",
    version: KEY_RECORD_VERSION,
    atom_type: "atoms.convergent-systems.co/keys",
    authored_by: key.keyId,
    created_at: createdAt,
    body: {
      fingerprint: key.keyId,
      public_key_base64: key.publicRawBase64,
      public_key_pem: key.publicPem,
      role: "root",
      status: "active",
      authority: "atoms.convergent-systems.co",
    },
  };
}

function buildKeysIndex(key, createdAt) {
  return {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/keys/index",
    version: KEY_RECORD_VERSION,
    atom_type: "atoms.convergent-systems.co/class-index",
    authored_by: key.keyId,
    created_at: createdAt,
    body: {
      class: "keys",
      keys: [
        {
          id: "root",
          fingerprint: key.keyId,
          role: "root",
          status: "active",
          url: "/keys/root.toml",
        },
      ],
    },
  };
}

function buildKeysRegistry(key, createdAt) {
  // Per Spec §20: catalog's key registry at <domain>/keys.toml. The umbrella's
  // registry currently has one entry: the bootstrap root key.
  return {
    spec_version: SPEC_VERSION,
    canonical_name: "atoms.convergent-systems.co/keys",
    version: KEYS_REGISTRY_VERSION,
    atom_type: "atoms.convergent-systems.co/key-registry",
    authored_by: key.keyId,
    created_at: createdAt,
    body: {
      authority: "atoms.convergent-systems.co",
      total: 1,
      keys: [
        {
          fingerprint: key.keyId,
          role: "root",
          status: "active",
          classes: ["*"],
          url: "/keys/root.toml",
        },
      ],
    },
  };
}

async function writeSignedAtom(outPath, atom) {
  const canonical = canonicalize(atom);
  const sig = signCanonicalHash(canonical);
  // sanity self-check
  if (!verifySignature(canonical, sig.signatureBase64)) {
    throw new Error(`self-verify failed for ${outPath}`);
  }
  const signatures = { [sig.keyId]: sig.signatureBase64 };
  const finalToml = renderFinal(atom, signatures);
  await writeFile(outPath, finalToml);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
