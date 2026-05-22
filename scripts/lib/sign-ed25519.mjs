// Ed25519 signing helpers + 1Password bridge for the atoms root key.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const VAULT = "Convergent Systems LLC";
const ITEM_TITLE = "atoms-root";

let cachedKey = null;

export function rootKey() {
  if (cachedKey) return cachedKey;
  const json = execFileSync(
    "op",
    ["item", "get", ITEM_TITLE, "--vault", VAULT, "--reveal", "--format=json"],
    { encoding: "utf-8" },
  );
  const item = JSON.parse(json);
  const fields = item.fields ?? [];
  const notesField = fields.find((f) => f.id === "notesPlain" || f.purpose === "NOTES");
  if (!notesField?.value) throw new Error("atoms-root note has no notesPlain field");

  const privPem = extractPemBlock(notesField.value, "PRIVATE KEY");
  const pubPem = extractPemBlock(notesField.value, "PUBLIC KEY");
  if (!privPem) throw new Error("private key PEM block not found in atoms-root notes");
  if (!pubPem) throw new Error("public key PEM block not found in atoms-root notes");

  const privateKey = crypto.createPrivateKey({ key: privPem, format: "pem" });
  const publicKey = crypto.createPublicKey({ key: pubPem, format: "pem" });

  const pubDer = publicKey.export({ format: "der", type: "spki" });
  const pubRaw = pubDer.subarray(-32);
  const fingerprint = crypto.createHash("sha256").update(pubRaw).digest("base64");

  cachedKey = {
    privateKey,
    publicKey,
    publicRawBase64: pubRaw.toString("base64"),
    publicPem: pubPem.trim(),
    fingerprint,
    keyId: `ed25519:${fingerprint}`,
  };
  return cachedKey;
}

export function signCanonicalHash(canonicalText) {
  const { privateKey, keyId } = rootKey();
  const hash = crypto.createHash("sha256").update(canonicalText, "utf-8").digest();
  const sig = crypto.sign(null, hash, privateKey);
  return {
    keyId,
    hashBase64: hash.toString("base64"),
    signatureBase64: sig.toString("base64"),
  };
}

export function verifySignature(canonicalText, signatureBase64, publicKeyOverride) {
  const { publicKey } = publicKeyOverride ? { publicKey: publicKeyOverride } : rootKey();
  const hash = crypto.createHash("sha256").update(canonicalText, "utf-8").digest();
  return crypto.verify(null, hash, publicKey, Buffer.from(signatureBase64, "base64"));
}

function extractPemBlock(text, label) {
  const re = new RegExp(`-----BEGIN ${label}-----[\\s\\S]*?-----END ${label}-----`, "m");
  const match = text.match(re);
  return match ? match[0] : null;
}
