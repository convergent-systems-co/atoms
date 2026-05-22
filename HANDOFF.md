# HANDOFF — atoms site provisioning, mid-execution checkpoint

**Last updated:** 2026-05-22, end-of-session
**Active branch in this checkout:** unknown — verify with `git branch --show-current`
**Spec + plan PR (open):** [#37](https://github.com/convergent-systems-co/atoms/pull/37)

## What's done

### Template alignment (completed today; prerequisite work)
All 16 *-atoms catalogs aligned to `astro-tf-app-template`. Spec: `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md`. Plan: `docs/superpowers/plans/2026-05-22-atoms-template-alignment.md`. Status: shipped end-to-end. Verifier at `scripts/verify-template-alignment.sh` passes all SC.

### Site provisioning (mid-execution)
Spec: `docs/superpowers/specs/2026-05-22-atoms-site-provisioning-design.md` (on PR #37).
Plan: `docs/superpowers/plans/2026-05-22-atoms-site-provisioning.md` (on PR #37).

| Phase | Status | PRs |
|---|---|---|
| Phase 0.1-0.4 | ✅ done — pages-project module migrated to `core-infra/terraform/cloudflare/pages-project/`, tag `v0.1.0` cut, umbrella references it via Git source, local module deleted | core-infra#17, atoms #27, #31 |
| Phase 0.3a | ✅ done — PAT-based git auth (`CORE_INFRA_READ_TOKEN` org secret, `--visibility all`); core-infra is PRIVATE again; tf-plan.yml in umbrella configures git creds before init | atoms #28, #29, #30 |
| Phase 1.1 | ✅ done — atoms umbrella migrated from Terraform to OpenTofu | atoms #32 |
| Phase 1.2 Batch 1 | ✅ done — channel, compliance, event, identity | channel#22, compliance#41, event#28, identity#34; pointer-bump atoms#33 |
| Phase 1.2 Batch 2 | ✅ done — knowledge, model, persona, plugin | knowledge#34, model#22, persona#39, plugin#33; pointer-bump atoms#35 |
| Phase 1.2 Batch 3 | ✅ done — policy, service, workflow, theme | policy#37, service#38, workflow#33, theme#47; pointer-bump atoms#36 |

12 of 16 catalogs on OpenTofu. 4 to go in Batch 4.

## What's NOT done — next session picks up here

| Phase | Catalogs / scope |
|---|---|
| Phase 1.2 Batch 4 | brand-atoms, agent-atoms, prompt-atoms, profile-atoms (CLI tool migration only — same delta as Batches 1-3) |
| Phase 2 | channel-atoms apply pilot (refactor TF to use core-infra module, `tofu apply` creates Pages project + custom domain + DNS, update release.yml to wrangler-deploy, merge, verify channel-atoms.com = 200) |
| Phase 3 | theme-atoms IMPORT pilot (refactor TF, `tofu import` existing Pages project + domain + DNS, verify empty plan, merge — production site) |
| Phase 4 | 12 catalogs in 2 parallel batches of 6 (compliance, event, identity, knowledge, model, persona) + (plugin, policy, service, workflow, agent, prompt) |
| Phase 5 | brand-atoms IMPORT (production site) + profile-atoms apply |
| Phase 6 | scripts/verify-sites-online.sh, xdao deprecation issue, final SC sweep |

## On-resume verification (do these before continuing)

Per Common.md U10: any assertion in this handoff that gates an action MUST be independently verified against live state. Don't trust this file — verify.

```bash
# 1. Confirm CORE_INFRA_READ_TOKEN exists at org level
gh secret list --org convergent-systems-co | grep CORE_INFRA_READ_TOKEN
# Expected: CORE_INFRA_READ_TOKEN ... ALL

# 2. Confirm core-infra is private
gh repo view convergent-systems-co/core-infra --json visibility --jq .visibility
# Expected: PRIVATE

# 3. Confirm core-infra v0.1.0 tag exists
git ls-remote --tags https://github.com/convergent-systems-co/core-infra.git refs/tags/v0.1.0
# Expected: one SHA line

# 4. Confirm umbrella's tf-plan.yml has the credentials step
gh api repos/convergent-systems-co/atoms/contents/.github/workflows/tf-plan.yml \
  --jq .content | base64 -d | grep CORE_INFRA_READ_TOKEN
# Expected: 2 matches (env declaration + run-block reference)

# 5. Confirm 12 catalogs on OpenTofu
for c in agent brand channel compliance event identity knowledge model persona plugin policy profile prompt service theme workflow; do
  gh api repos/convergent-systems-co/$c-atoms/contents/.opentofu-version 2>/dev/null \
    | jq -r '.content // "missing"' | head -1 | head -c 20
  echo " : $c-atoms"
done
# Expected: 12 of 16 have content; brand/agent/prompt/profile still missing
```

## Outstanding artifacts

- **Spec + plan PR #37** (atoms umbrella) — opens with the spec and plan files. Mergeable on its own (additive); merging makes the docs canonical on main. Either merge it before resuming Phase 1.2 Batch 4, or rebase Phase 1.2 Batch 4's bump PR over it. The latter is fine because the files don't conflict with anything.

- **Two violation logs from today** at `~/.ai/audit/violations/`:
  - `2026-05-22T120819Z.md` — U17 worktree placement
  - `2026-05-22T145028Z.md` — Cloudflare token leak (token has been rotated)
  - `2026-05-22T194746Z.md` — subagent flipped core-infra to PUBLIC without authorization (remediated by Phase 0.3a)

## How to resume

Open a fresh Claude Code session in `/Users/itsfwcp/workspace/convergent-system-co/atoms`. Tell it:

> Resume the atoms site provisioning plan at `docs/superpowers/plans/2026-05-22-atoms-site-provisioning.md`. The previous session checkpointed after Phase 1.2 Batch 3. The next task is Phase 1.2 Batch 4 (brand-atoms, agent-atoms, prompt-atoms, profile-atoms — OpenTofu CLI migration, same as Batches 1-3). After Batch 4 + its pointer-bump PR, proceed to Phase 2 (channel-atoms apply pilot). Read HANDOFF.md and verify the on-resume checks before any action.

## Last known-good commits

- atoms umbrella main: at the point this handoff was written, see `git log --oneline -1 origin/main`
- core-infra main: see `git log --oneline -1 origin/main` in core-infra (the v0.1.0 tag pins module ref)
- Per-catalog main HEADs: each catalog's `chore/migrate-to-opentofu` PR merged; latest main commits in each catalog repo represent the OpenTofu CLI migration

## Open questions for the next session

- Q1. Should PR #37 (spec + plan) be merged into main before Batch 4 starts, or kept open until all phases ship? Recommendation: merge now (it's additive and makes the canonical docs visible to anyone reading main).
- Q2. The catalog TF config files still have the old scaffold-stub (`cloudflare_pages_project.site` resource, `root_dir = "web/site"`, provider ~> 4.0). They will be rewritten in Phase 2 (channel-atoms first, then Phase 4 for the rest). No action needed in Batch 4.
- Q3. The CORE_INFRA_READ_TOKEN credentials step exists in atoms umbrella's tf-plan.yml. It must be added to each catalog's tf-plan.yml during Phase 2/3/4/5 PRs (when the catalog's TF starts referencing the core-infra module). Phase 1.2 Batch 4 does NOT add it yet — the catalogs still have local stub TF that doesn't reach out to core-infra.
