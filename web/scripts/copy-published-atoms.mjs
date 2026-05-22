// Copy signed atoms from repo-root sources of truth into web/public/ for
// publication via Cloudflare Pages. Atoms themselves are NOT regenerated here
// — they're produced by scripts/sign-atoms.mjs and committed. The web build
// step just publishes what's already canonical.
//
// Signed sources → published paths:
//   spec/atom-spec.md          → public/spec/atom-spec.md
//   spec/atom-spec.toml        → public/spec/atom-spec.toml
//   spec/atom-spec@*.toml      → public/spec/atom-spec@*.toml
//   spec/index.toml            → public/spec/index.toml
//   catalogs/*.toml            → public/catalogs/*.toml
//   keys/*.toml                → public/keys/*.toml
//   keys.toml                  → public/keys.toml

import { readdir, mkdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const WEB = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO = resolve(WEB, "..");

async function copyDir(src, dest) {
  if (!existsSync(src)) {
    throw new Error(`source missing: ${src} — run \`node scripts/sign-atoms.mjs\` first`);
  }
  await mkdir(dest, { recursive: true });
  let n = 0;
  for (const entry of await readdir(src)) {
    const s = join(src, entry);
    if ((await stat(s)).isFile()) {
      await copyFile(s, join(dest, entry));
      n += 1;
    }
  }
  return n;
}

async function main() {
  // Spec markdown plus all spec/*.toml.
  const specOut = join(WEB, "public/spec");
  const spec = await copyDir(join(REPO, "spec"), specOut);

  const catalogs = await copyDir(join(REPO, "catalogs"), join(WEB, "public/catalogs"));
  const keys = await copyDir(join(REPO, "keys"), join(WEB, "public/keys"));

  const keysRegistry = join(REPO, "keys.toml");
  if (!existsSync(keysRegistry)) {
    throw new Error("keys.toml missing — run `node scripts/sign-atoms.mjs` first");
  }
  await copyFile(keysRegistry, join(WEB, "public/keys.toml"));

  console.log(
    `published: ${spec} spec files, ${catalogs} catalog entries, ` +
      `${keys} key records, keys.toml`,
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
