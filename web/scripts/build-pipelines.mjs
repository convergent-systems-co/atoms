// Generates web/public/pipelines.json from the pipeline-atoms submodule.
// Reads:
//   src/pipeline-atoms/atoms/**/*.json  → pipeline atoms
// Output is consumed by web/src/pages/pipelines/index.astro at build time.
//
// workflow-atoms was retired as a submodule (merging into ai-atoms as an atom
// type); until that migration lands, workflow_compositions has no source and
// stays empty.

import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const PUBLIC = join(WEB_DIR, "public");

async function readJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  const entries = await readdir(dir, { recursive: true });
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const full = join(dir, entry);
    if (!(await stat(full)).isFile()) continue;
    try {
      const raw = await readFile(full, "utf-8");
      results.push(JSON.parse(raw));
    } catch {
      // skip malformed files
    }
  }
  return results;
}

async function main() {
  const pipelineDir = join(REPO_DIR, "src", "pipeline-atoms", "atoms");
  const pipelineAtoms = await readJsonFiles(pipelineDir);
  const workflowCompositions = [];

  // The compositions that power the atoms ecosystem itself
  const ecosystemCompositions = ["atoms-catalog-cicd", "terraform-lifecycle", "repo-governance", "security-baseline"];

  const output = {
    built_at: new Date().toISOString(),
    ecosystem_compositions: ecosystemCompositions,
    pipeline_atoms: pipelineAtoms.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "")),
    workflow_compositions: workflowCompositions.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "")),
    summary: {
      pipeline_atoms: pipelineAtoms.length,
      workflow_compositions: workflowCompositions.length,
    },
  };

  await mkdir(PUBLIC, { recursive: true });
  const outPath = join(PUBLIC, "pipelines.json");
  await writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`wrote ${outPath} — ${pipelineAtoms.length} pipeline atoms, ${workflowCompositions.length} workflow compositions`);
}

main().catch((e) => { console.error(e); process.exit(1); });
