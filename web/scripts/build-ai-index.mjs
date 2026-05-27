// Generates web/public/ai/index.json — the AI-first discovery endpoint for
// the atoms.convergent-systems.co umbrella site.
//
// An AI reading this endpoint is immediately directed to /ai/instructions.md
// (the first key in the JSON) before exploring the catalog list.
//
// This script runs AFTER build-directory.mjs so directory.json is already
// written and carries the full catalog metadata.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const PUBLIC = join(WEB_DIR, "public");

async function main() {
  const directoryPath = join(PUBLIC, "directory.json");
  if (!existsSync(directoryPath)) {
    throw new Error("directory.json not found — run build-directory.mjs first");
  }
  const directory = JSON.parse(await readFile(directoryPath, "utf-8"));
  const catalogs = directory.catalogs ?? [];

  const aiCatalogs = catalogs
    .filter((c) => c.status !== "missing" && c.status !== "invalid")
    .map((c) => ({
      name: c.name,
      domain: c.domain,
      ai_endpoint: c.ai_endpoint,
      description: c.description ?? c.purpose ?? null,
      atom_types: c.atom_types ?? [],
      classes: (c.atom_types ?? []).length,
      atoms: c.local_atoms ?? 0,
      status: c.status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const index = {
    // instructions is the first key — any AI streaming this response sees it immediately
    instructions: "https://atoms.convergent-systems.co/ai/instructions.md",
    version: "1",
    site: "https://atoms.convergent-systems.co",
    description:
      "Master AI discovery index for the Convergent Systems atoms ecosystem — typed, versioned, composable libraries of AI primitives. Read instructions first, then explore the catalog list.",
    summary: {
      total_catalogs: aiCatalogs.length,
      live: directory.summary?.live ?? 0,
      bootstrap: directory.summary?.bootstrap ?? 0,
    },
    catalogs: aiCatalogs,
  };

  const aiDir = join(PUBLIC, "ai");
  await mkdir(aiDir, { recursive: true });
  const outPath = join(aiDir, "index.json");
  await writeFile(outPath, JSON.stringify(index, null, 2));
  console.log(`wrote ${outPath} — ${aiCatalogs.length} catalogs`);
}

main().catch((e) => { console.error(e); process.exit(1); });
