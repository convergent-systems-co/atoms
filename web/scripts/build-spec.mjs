import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const SPEC_SRC = join(REPO_DIR, "spec/atom-spec.md");
const SPEC_OUT_DIR = join(WEB_DIR, "public/spec");

const SPEC_VERSION = "1.0.0";
const SPEC_CANONICAL_NAME = "atoms.convergent-systems.co/spec/atom-spec";
const SPEC_ATOM_TYPE = "atoms.convergent-systems.co/spec";

const BOOTSTRAP_HEADER = `# BOOTSTRAP: pre-keygen. Per Part IX §40, the Spec MUST be signed by the
# atoms.convergent-systems.co root key. That key has not been minted yet,
# so authored_by and [signatures] carry "bootstrap-pending" placeholders.
# This file becomes spec-conformant when the root key is generated and the
# atom is signed in a subsequent slice.
`;

async function main() {
  if (!existsSync(SPEC_SRC)) {
    throw new Error(`spec source missing: ${SPEC_SRC}`);
  }
  const markdown = await readFile(SPEC_SRC, "utf-8");
  const builtAt = new Date().toISOString();

  await mkdir(SPEC_OUT_DIR, { recursive: true });

  await writeFile(join(SPEC_OUT_DIR, "atom-spec.md"), markdown);
  await writeFile(
    join(SPEC_OUT_DIR, `atom-spec@${SPEC_VERSION}.md`),
    markdown,
  );

  const toml = renderSpecToml(markdown, builtAt);
  await writeFile(join(SPEC_OUT_DIR, "atom-spec.toml"), toml);
  await writeFile(
    join(SPEC_OUT_DIR, `atom-spec@${SPEC_VERSION}.toml`),
    toml,
  );

  const index = renderSpecIndex(builtAt);
  await writeFile(join(SPEC_OUT_DIR, "index.toml"), index);

  console.log(`wrote ${SPEC_OUT_DIR}/atom-spec.{md,toml} (+ @${SPEC_VERSION} aliases, index.toml)`);
}

function renderSpecToml(markdown, builtAt) {
  // TOML multi-line basic strings use """...""". Escape backslashes and
  // the """ sequence inside the body so the literal is valid.
  const safe = markdown
    .replace(/\\/g, "\\\\")
    .replace(/"""/g, '\\"\\"\\"');
  return `${BOOTSTRAP_HEADER}
spec_version = "${SPEC_VERSION}"
canonical_name = "${SPEC_CANONICAL_NAME}"
version = "${SPEC_VERSION}"
atom_type = "${SPEC_ATOM_TYPE}"
authored_by = "ed25519:bootstrap-pending"
created_at = "${builtAt}"

[signatures]
# pending — see bootstrap header

[body]
title = "The Atom Spec"
status = "v${SPEC_VERSION} — Constitutional design for the *-atoms ecosystem"
markdown_url = "/spec/atom-spec.md"
markdown = """
${safe}"""
`;
}

function renderSpecIndex(builtAt) {
  return `# Index of published Spec versions.
built_at = "${builtAt}"

[[versions]]
version = "${SPEC_VERSION}"
status = "bootstrap"
toml = "/spec/atom-spec@${SPEC_VERSION}.toml"
markdown = "/spec/atom-spec@${SPEC_VERSION}.md"
latest_toml = "/spec/atom-spec.toml"
latest_markdown = "/spec/atom-spec.md"
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
