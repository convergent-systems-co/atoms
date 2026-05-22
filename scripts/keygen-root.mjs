#!/usr/bin/env node
// Generate the atoms.convergent-systems.co root Ed25519 signing key.
//
// Per Spec Part IX §40, this key is the bootstrap root: it signs the Spec
// atom and underwrites trust for the umbrella catalog-of-catalogs. The
// PRIVATE half is written to 1Password (vault: "Convergent Systems LLC",
// item: "atoms-root") via `op item create -` over stdin. The private key
// NEVER touches the filesystem, process arguments, environment, or this
// script's stdout/stderr.
//
// Outputs (public):
//   - fingerprint  base64(SHA-256(raw 32-byte public key))
//   - public key   base64 raw + PEM SPKI
//
// Refuses to run if an `atoms-root` item already exists in the vault.

import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VAULT = "Convergent Systems LLC";
const ITEM_TITLE = "atoms-root";

async function run() {
  await ensureItemDoesNotExist();

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  const pubDer = publicKey.export({ format: "der", type: "spki" });
  const pubRaw = pubDer.subarray(-32);
  const pubBase64 = pubRaw.toString("base64");

  const fingerprint = crypto
    .createHash("sha256")
    .update(pubRaw)
    .digest("base64");

  const privPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString().trim();
  const pubPem = publicKey.export({ format: "pem", type: "spki" }).toString().trim();
  const createdAt = new Date().toISOString();

  const notes = [
    "atoms.convergent-systems.co — root Ed25519 signing key",
    "",
    "Per Spec Part IX §40, the bootstrap root key. Signs the Atom Spec and",
    "the umbrella catalog registry. Loss recovery requires re-bootstrapping",
    "the entire Spec — treat accordingly.",
    "",
    `fingerprint: ${fingerprint}`,
    `created_at:  ${createdAt}`,
    "",
    privPem,
    "",
    pubPem,
  ].join("\n");

  // Template shape matches `op item template get "Secure Note"` exactly.
  // Each field needs id, label, type. Extra fields use a "custom" section.
  const template = {
    title: ITEM_TITLE,
    category: "SECURE_NOTE",
    fields: [
      { id: "notesPlain", type: "STRING", purpose: "NOTES", label: "notesPlain", value: notes },
      { id: "fingerprint", type: "STRING", label: "fingerprint", value: fingerprint, section: { id: "key-metadata" } },
      { id: "public_key_base64", type: "STRING", label: "public_key_base64", value: pubBase64, section: { id: "key-metadata" } },
      { id: "public_key_pem", type: "STRING", label: "public_key_pem", value: pubPem, section: { id: "key-metadata" } },
      { id: "created_at", type: "STRING", label: "created_at", value: createdAt, section: { id: "key-metadata" } },
    ],
    sections: [{ id: "key-metadata", label: "Key metadata" }],
  };

  await opCreateFromTemplateFile(template);

  console.log("\n=== Root key generated and stored in 1Password ===\n");
  console.log(`fingerprint:        ed25519:${fingerprint}`);
  console.log(`public key (b64):   ${pubBase64}`);
  console.log(`1Password location: ${VAULT} / ${ITEM_TITLE}`);
  console.log(`created_at:         ${createdAt}`);
  console.log("\nPrivate key is in 1Password only — not in repo, env, args, stdout, or history.");
  console.log("Next: scripts/sign-atoms.mjs to sign the Spec, registry, and key record.");
}

function ensureItemDoesNotExist() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "op",
      ["item", "get", ITEM_TITLE, "--vault", VAULT, "--format=json"],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    proc.stderr.on("data", (c) => (err += c.toString()));
    proc.on("exit", (code) => {
      if (code === 0) {
        reject(
          new Error(
            `refusing to overwrite existing 1Password item "${ITEM_TITLE}" in vault "${VAULT}". ` +
              `delete or rename it first if you really mean to re-bootstrap.`,
          ),
        );
      } else if (/isn't an item/i.test(err) || /not found/i.test(err) || code === 1) {
        resolve();
      } else {
        reject(new Error(`op item get failed: ${err.trim()}`));
      }
    });
  });
}

function opCreateFromTemplateFile(template) {
  // Write template to a tmpfile with mode 0600, immediately delete after op exits.
  // The private key transits through the tmpfile but never appears in process args.
  // op's default stdout echoes the full stored fields including the PRIVATE KEY —
  // we MUST capture-and-discard, never inherit/relay. Per Common.md §4.3.
  const tmpPath = join(tmpdir(), `atoms-root-template-${process.pid}-${Date.now()}.json`);
  writeFileSync(tmpPath, JSON.stringify(template), { mode: 0o600 });
  chmodSync(tmpPath, 0o600);
  try {
    const result = spawnSync(
      "op",
      ["item", "create", "--vault", VAULT, "--template", tmpPath, "--format=json"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      // Stderr is safe to surface (op error messages don't contain values).
      throw new Error(`op item create exit ${result.status}: ${(result.stderr ?? "").toString().trim()}`);
    }
    // Parse JSON only to confirm success — discard immediately.
    const out = (result.stdout ?? "").toString();
    if (out.length === 0) throw new Error("op item create produced no output");
    JSON.parse(out); // throws if malformed
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
}

run().catch((e) => {
  console.error("error:", e.message);
  process.exit(1);
});
