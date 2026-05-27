// Generates web/public/pipelines.json from pipeline-atoms and workflow-atoms submodules.
// Reads:
//   src/pipeline-atoms/atoms/**/*.json  → pipeline atoms
//   src/workflow-atoms/workflows/*.json → workflow compositions
// Output is consumed by web/src/pages/pipelines/index.astro at build time.

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
  const workflowDir = join(REPO_DIR, "src", "workflow-atoms", "workflows");

  const [pipelineAtoms, workflowCompositions] = await Promise.all([
    readJsonFiles(pipelineDir),
    readJsonFiles(workflowDir),
  ]);

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
