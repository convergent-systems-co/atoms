# Atoms Site Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring 13 currently-offline `*-atoms.com` sites online and bring 2 existing live sites (theme, brand) under the same OpenTofu-managed pattern as `atoms.convergent-systems.co`, with the `pages-project` module hosted in `convergent-systems-co/core-infra`.

**Architecture:** Move the pages-project Terraform module from atoms umbrella to core-infra. Migrate all atoms repos from Terraform to OpenTofu (matching core-infra). For each catalog repo, replace the template's stub TF with a thin envs/prod that references the core-infra module via Git source. State per catalog lives in the existing cs-tfstate R2 bucket. CI/CD deploys site content via `wrangler pages deploy` on merge to main.

**Tech Stack:** OpenTofu ≥ 1.10, Cloudflare provider 5.x, Cloudflare Pages, Cloudflare R2 (S3-compatible state backend), wrangler, GitHub Actions, gh CLI

**Source spec:** `docs/superpowers/specs/2026-05-22-atoms-site-provisioning-design.md`

---

## Pre-flight (required before Task 0.1)

These prerequisites MUST be true before the plan can begin. They are NOT tasks — they are gates.

- [ ] **CLOUDFLARE_API_TOKEN rotated** after the leak documented in `~/.ai/audit/violations/2026-05-22T145028Z.md`. New token exported in the operator's shell. GitHub org-level secret `CLOUDFLARE_API_TOKEN` updated.
- [ ] **OpenTofu installed** locally:
  ```bash
  brew install opentofu
  tofu version   # must report >= 1.10.0
  ```
- [ ] **Cloudflare account ID** known. Look up via `dash.cloudflare.com → any zone → Overview → Account ID` in the right sidebar. Export as `TF_VAR_cloudflare_account_id` in shell.
- [ ] **gh CLI authenticated** for `convergent-systems-co` org:
  ```bash
  gh auth status
  # if not authenticated: gh auth login
  ```
- [ ] **Sibling repos cloned** at `/Users/itsfwcp/workspace/convergent-system-co/`:
  - `core-infra` (mutated by Phase 0)
  - `atoms` (umbrella; mutated by Phase 0, Phase 1.1)
  - All 16 `<catalog>-atoms` submodules (mutated Phase 2 onward)

If any pre-flight is not met, stop and fix it before Task 0.1.

---

## File Structure

### Phase 0 creates / modifies

```
core-infra/terraform/cloudflare/pages-project/   ← NEW (moved from atoms)
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  README.md

atoms/infra/terraform/envs/prod/main.tf          ← MODIFIED (source path)
atoms/infra/terraform/modules/pages-project/     ← DELETED (after Phase 5)
```

### Phase 1 creates / modifies

```
For atoms umbrella + each of 16 catalog repos:
  .opentofu-version                              ← NEW at repo root
  .terraform-version                             ← DELETED (if present)
  Makefile                                       ← MODIFIED (terraform → tofu)
  .github/workflows/tf-plan.yml                  ← MODIFIED (tofu setup)
```

### Phase 2 creates / modifies (channel-atoms only; pattern then repeats per catalog)

```
src/channel-atoms/infra/terraform/envs/prod/
  main.tf                                        ← REWRITTEN
  backend.tf                                     ← REWRITTEN
  versions.tf                                    ← REWRITTEN (or new)
  terraform.tfvars                               ← MODIFIED
src/channel-atoms/infra/terraform/modules/       ← DELETED if .keep-only
src/channel-atoms/.github/workflows/release.yml  ← MODIFIED (wrangler deploy)
```

### Phase 3-5 create / modify per catalog

Same shape as Phase 2 for each remaining catalog. `import` adds rows to the per-catalog state file but creates no new repo files beyond the Phase 2 set.

### Phase 6 creates

```
atoms/scripts/verify-sites-online.sh             ← NEW
```

---

# PHASE 0 — Module migration to core-infra

## Task 0.1: Copy pages-project module to core-infra

**Repo:** `core-infra`

**Files:**
- Create: `terraform/cloudflare/pages-project/main.tf`
- Create: `terraform/cloudflare/pages-project/variables.tf`
- Create: `terraform/cloudflare/pages-project/outputs.tf`
- Create: `terraform/cloudflare/pages-project/versions.tf`
- Create: `terraform/cloudflare/pages-project/README.md`

- [ ] **Step 1: Branch core-infra**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/core-infra
git fetch origin && git switch main && git pull origin main
git switch -c feat/pages-project-module
```

- [ ] **Step 2: Copy the module verbatim**

```bash
cp -R /Users/itsfwcp/workspace/convergent-system-co/atoms/infra/terraform/modules/pages-project \
      terraform/cloudflare/pages-project
ls -la terraform/cloudflare/pages-project/
```

Expected: five files present (main.tf, variables.tf, outputs.tf, versions.tf, README.md).

- [ ] **Step 3: Verify module syntax with `tofu fmt -check`**

```bash
cd terraform/cloudflare/pages-project
tofu fmt -check -recursive
echo "exit=$?"
```

Expected: exit 0 (no formatting changes needed). If exit 3 (formatting drift), run `tofu fmt -recursive` and re-verify.

- [ ] **Step 4: Verify init works against the new location**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/core-infra/terraform/cloudflare/pages-project
tofu init -backend=false
# -backend=false: this is a module, not a root config; no state needed
```

Expected: "OpenTofu has been successfully initialized!"

- [ ] **Step 5: Commit**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/core-infra
git add terraform/cloudflare/pages-project/
git commit -m "feat(cloudflare): add pages-project module

Imported from convergent-systems-co/atoms/infra/terraform/modules/pages-project.
This is the canonical home (core-infra is shared infra per GOALS.md §2);
the atoms-side copy will be removed after consumers have migrated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 0.2: PR + release tag for core-infra

**Repo:** `core-infra`

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/pages-project-module
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --repo convergent-systems-co/core-infra \
  --title "feat(cloudflare): add pages-project module" \
  --body "## Summary
Imports the Cloudflare Pages project module from atoms umbrella. core-infra is the canonical home per GOALS.md §2 (shared infra available to every system).

## Test plan
- [ ] \`tofu fmt -check -recursive terraform/cloudflare/pages-project/\` passes
- [ ] No state changes — this is a module-only addition

Source: convergent-systems-co/atoms/infra/terraform/modules/pages-project

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: Wait for CI green**

```bash
gh pr checks --repo convergent-systems-co/core-infra --watch
```

- [ ] **Step 4: Merge**

```bash
gh pr merge --repo convergent-systems-co/core-infra --merge --delete-branch
# Use --merge unless the repo allows squash. Try --squash first; fall back to --merge.
```

- [ ] **Step 5: Tag release v0.1.0**

```bash
git switch main && git pull origin main
git tag -a v0.1.0 -m "v0.1.0 — pages-project module imported from atoms"
git push origin v0.1.0
```

- [ ] **Step 6: Verify the tag is reachable via Git source**

```bash
git ls-remote --tags https://github.com/convergent-systems-co/core-infra.git refs/tags/v0.1.0
```

Expected: one line of output with the tag's commit SHA.

## Task 0.3: Update atoms umbrella to reference core-infra module

**Repo:** `atoms`

**Files:**
- Modify: `infra/terraform/envs/prod/main.tf` (the `module "pages_project"` source path)

- [ ] **Step 1: Branch atoms umbrella**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git switch -c chore/move-module-to-core-infra
```

- [ ] **Step 2: Update module source path**

In `infra/terraform/envs/prod/main.tf`, find this line (around line 8):

```hcl
module "pages_project" {
  source = "../../modules/pages-project"
```

Change to:

```hcl
module "pages_project" {
  source = "git::https://github.com/convergent-systems-co/core-infra.git//terraform/cloudflare/pages-project?ref=v0.1.0"
```

Keep all other arguments (cloudflare_account_id, project_name, custom_domain, zone_id) unchanged.

- [ ] **Step 3: Re-initialize TF**

```bash
cd infra/terraform/envs/prod
tofu init -upgrade
```

Expected: "Downloading git::https://github.com/convergent-systems-co/core-infra.git ..." followed by "OpenTofu has been successfully initialized!"

Note: if you're still on Terraform (not yet OpenTofu — that's Phase 1), use `terraform init -upgrade` here. Phase 1 will switch this to `tofu`.

- [ ] **Step 4: CRITICAL — verify plan is empty**

```bash
tofu plan
```

Expected: "No changes. Your infrastructure matches the configuration."

If plan shows any changes, STOP. The new module source must be byte-equal to the old one. Compare:

```bash
diff -r /Users/itsfwcp/workspace/convergent-system-co/atoms/infra/terraform/modules/pages-project \
        /Users/itsfwcp/workspace/convergent-system-co/core-infra/terraform/cloudflare/pages-project
```

Resolve drift before continuing.

- [ ] **Step 5: Commit**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git add infra/terraform/envs/prod/main.tf
git commit -m "chore(infra): source pages-project module from core-infra v0.1.0

Module moved to its canonical home in core-infra/terraform/cloudflare/
per the atoms-site-provisioning design. Plan is a no-op — module
contents are unchanged, only the source path moves.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin chore/move-module-to-core-infra
gh pr create --repo convergent-systems-co/atoms \
  --title "chore(infra): source pages-project module from core-infra v0.1.0" \
  --body "Module moved to core-infra (PR convergent-systems-co/core-infra#N, tag v0.1.0). Plan verified empty against existing R2 state.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 7: Wait for CI green; merge**

```bash
gh pr checks --repo convergent-systems-co/atoms --watch
gh pr merge --repo convergent-systems-co/atoms --merge --delete-branch
git switch main && git pull origin main
```

## Task 0.4: Delete the old module from atoms umbrella

**Repo:** `atoms`

**Files:**
- Delete: `infra/terraform/modules/pages-project/`

- [ ] **Step 1: Branch**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/delete-old-module
```

- [ ] **Step 2: Delete the directory**

```bash
git rm -r infra/terraform/modules/pages-project
git status -s
```

Expected: five files marked `D infra/terraform/modules/pages-project/...`

- [ ] **Step 3: Verify umbrella still inits from the Git source**

```bash
cd infra/terraform/envs/prod
tofu init
tofu plan
```

Expected: plan is "No changes" (same as Task 0.3 Step 4). If plan tries to do something, the source path in main.tf is still pointing at the local module — fix before continuing.

- [ ] **Step 4: Commit and PR**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git commit -m "chore(infra): remove pages-project module (moved to core-infra)

The module lives at core-infra/terraform/cloudflare/pages-project/ now.
Umbrella sources it via git::core-infra ref=v0.1.0 (PR #N).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin chore/delete-old-module
gh pr create --repo convergent-systems-co/atoms \
  --title "chore(infra): remove pages-project module (moved to core-infra)" \
  --body "Cleanup. The module is now sourced from core-infra v0.1.0."
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

---

# PHASE 1 — OpenTofu migration

## Task 1.1: Migrate atoms umbrella to OpenTofu

**Repo:** `atoms`

**Files:**
- Delete: `.terraform-version` (if present at infra/terraform/.terraform-version or repo root)
- Create: `.opentofu-version` (repo root, content: `1.10.0`)
- Modify: `Makefile` (replace `terraform` with `tofu`)
- Modify: `.github/workflows/tf-plan.yml` (use opentofu/setup-opentofu)

- [ ] **Step 1: Branch**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/migrate-to-opentofu
```

- [ ] **Step 2: Find and remove .terraform-version files**

```bash
find . -name '.terraform-version' -not -path './src/*' -not -path './.git/*'
git rm $(find . -name '.terraform-version' -not -path './src/*' -not -path './.git/*' 2>/dev/null) 2>/dev/null || echo "(none found)"
```

- [ ] **Step 3: Write .opentofu-version**

```bash
echo "1.10.0" > .opentofu-version
cat .opentofu-version
```

Expected output: `1.10.0`

- [ ] **Step 4: Update Makefile**

Find the existing Makefile in repo root. Replace `terraform` invocations with `tofu`:

```bash
sed -i.bak 's/terraform /tofu /g; s/^TF_BIN.*=.*terraform/TF_BIN ?= tofu/g' Makefile
rm Makefile.bak
grep -n 'tofu\|terraform' Makefile
```

Expected: every `terraform` invocation replaced with `tofu`. Manual sanity check — read the diff before staging:

```bash
git diff Makefile
```

- [ ] **Step 5: Update tf-plan workflow**

In `.github/workflows/tf-plan.yml`, find the existing `hashicorp/setup-terraform@v3` action and replace with `opentofu/setup-opentofu@v1`:

```yaml
# Before:
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "1.7"

# After:
- uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: "1.10.0"
```

Also replace any `terraform plan`, `terraform init`, `terraform fmt -check` commands in the workflow's `run:` blocks with `tofu plan`, `tofu init`, `tofu fmt -check`. Read the file in full first:

```bash
cat .github/workflows/tf-plan.yml
```

Apply edits via your editor, then check:

```bash
grep -c 'terraform' .github/workflows/tf-plan.yml
# Expected: 0 (no more references to terraform CLI)
```

- [ ] **Step 6: Verify locally**

```bash
cd infra/terraform/envs/prod
tofu init
tofu plan
```

Expected: plan "No changes." The OpenTofu binary reads the same R2-backed state and produces the same plan.

- [ ] **Step 7: Commit, push, PR, merge**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git add .opentofu-version Makefile .github/workflows/tf-plan.yml
git status
git commit -m "chore: migrate from Terraform to OpenTofu

Aligns with core-infra (which uses OpenTofu). State backend, module
references, and plan output are unchanged — only the CLI binary
differs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin chore/migrate-to-opentofu
gh pr create --repo convergent-systems-co/atoms \
  --title "chore: migrate from Terraform to OpenTofu" \
  --body "Aligns with core-infra. \`tofu plan\` against existing R2 state is empty."
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

## Task 1.2: Migrate all 16 catalog repos to OpenTofu (parallel batches of 4)

**Repos:** all 16 `<catalog>-atoms`

**Files per repo:**
- Delete: `infra/terraform/.terraform-version`
- Create: `.opentofu-version` (repo root, content `1.10.0`)
- Modify: `Makefile` (`terraform → tofu`)
- Modify: `.github/workflows/tf-plan.yml` (use opentofu/setup-opentofu)

This task is mechanical and repeats the Task 1.1 pattern in each catalog. It is parallelizable. The plan groups catalogs into 4 batches of 4.

- [ ] **Step 1: Batch 1 — channel, compliance, event, identity**

For each catalog `<C>` in `[channel-atoms, compliance-atoms, event-atoms, identity-atoms]`:

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/<C>
git fetch origin && git switch main && git pull origin main
git switch -c chore/migrate-to-opentofu

# Remove any existing .terraform-version files
find . -name '.terraform-version' -not -path './.git/*' -exec git rm {} \;

# Write .opentofu-version at repo root
echo "1.10.0" > .opentofu-version

# Update Makefile
sed -i.bak 's/terraform /tofu /g' Makefile
rm Makefile.bak

# Update tf-plan workflow
sed -i.bak \
  -e 's|hashicorp/setup-terraform@v3|opentofu/setup-opentofu@v1|g' \
  -e 's|terraform_version:|tofu_version:|g' \
  -e 's|terraform init|tofu init|g' \
  -e 's|terraform plan|tofu plan|g' \
  -e 's|terraform fmt|tofu fmt|g' \
  -e 's|terraform validate|tofu validate|g' \
  .github/workflows/tf-plan.yml
rm .github/workflows/tf-plan.yml.bak

# Commit, push, PR, merge
git add .opentofu-version Makefile .github/workflows/tf-plan.yml
git status -s
git commit -m "chore: migrate from Terraform to OpenTofu

Aligns with core-infra.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin chore/migrate-to-opentofu
gh pr create --repo convergent-systems-co/<C> \
  --title "chore: migrate from Terraform to OpenTofu" \
  --body "Aligns with core-infra and atoms umbrella."
gh pr checks --repo convergent-systems-co/<C> --watch
gh pr merge --repo convergent-systems-co/<C> --merge --delete-branch
git switch main && git pull origin main
```

- [ ] **Step 2: Bump umbrella submodule pointers for Batch 1**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/bump-opentofu-batch-1
git submodule update --remote src/channel-atoms src/compliance-atoms src/event-atoms src/identity-atoms
git add src/channel-atoms src/compliance-atoms src/event-atoms src/identity-atoms
git commit -m "chore: bump batch 1 submodules (OpenTofu migration)"
git push -u origin chore/bump-opentofu-batch-1
gh pr create --title "chore: bump batch 1 submodules (OpenTofu)" --body "Picks up OpenTofu migration PRs in each catalog."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

- [ ] **Step 3: Batch 2 — knowledge, model, persona, plugin**

Repeat Step 1 with catalogs `[knowledge-atoms, model-atoms, persona-atoms, plugin-atoms]`. Then repeat Step 2 with `chore/bump-opentofu-batch-2`.

- [ ] **Step 4: Batch 3 — policy, service, workflow, theme**

Repeat Step 1 with `[policy-atoms, service-atoms, workflow-atoms, theme-atoms]`. Then bump.

- [ ] **Step 5: Batch 4 — brand, agent, prompt, profile**

Repeat Step 1 with `[brand-atoms, agent-atoms, prompt-atoms, profile-atoms]`. Then bump.

- [ ] **Step 6: Verify all 16 catalogs have .opentofu-version**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
for c in agent brand channel compliance event identity knowledge model persona plugin policy profile prompt service theme workflow; do
  if [[ -f src/$c-atoms/.opentofu-version ]]; then
    echo "PASS: $c-atoms"
  else
    echo "FAIL: $c-atoms missing .opentofu-version"
  fi
done
```

Expected: all 16 PASS.

---

# PHASE 2 — Pilot 1 of 13: channel-atoms

## Task 2.1: Refactor channel-atoms TF to target pattern

**Repo:** `channel-atoms` (submodule)

**Files:**
- Rewrite: `infra/terraform/envs/prod/main.tf`
- Rewrite: `infra/terraform/envs/prod/backend.tf`
- Rewrite: `infra/terraform/envs/prod/versions.tf`
- Modify: `infra/terraform/envs/prod/terraform.tfvars`
- Delete: `infra/terraform/modules/` if `.keep`-only

- [ ] **Step 1: Branch**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms
git fetch origin && git switch main && git pull origin main
git switch -c feat/provision-pages
```

- [ ] **Step 2: Write new main.tf**

```bash
cat > infra/terraform/envs/prod/main.tf <<'EOF'
# CLOUDFLARE_API_TOKEN must be exported in the runner's environment.
# Required token scopes:
#   - Account → Cloudflare Pages → Edit
#   - Zone → DNS → Edit (for the channel-atoms.com zone)
provider "cloudflare" {}

module "pages_project" {
  source = "git::https://github.com/convergent-systems-co/core-infra.git//terraform/cloudflare/pages-project?ref=v0.1.0"

  cloudflare_account_id = var.cloudflare_account_id
  project_name          = "channel-atoms"
  production_branch     = "main"
  custom_domain         = "channel-atoms.com"
  zone_id               = var.zone_id
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for channel-atoms.com. Look up via dash.cloudflare.com → channel-atoms.com → Overview → Zone ID."
  type        = string
}

output "subdomain" {
  value = module.pages_project.subdomain
}

output "custom_domain" {
  value = module.pages_project.custom_domain
}
EOF
```

- [ ] **Step 3: Write new backend.tf**

```bash
cat > infra/terraform/envs/prod/backend.tf <<'EOF'
terraform {
  backend "s3" {
    bucket = "cs-tfstate"
    key    = "state-bucket/convergent-systems-co/channel-atoms/pages-project.tfstate"
    region = "auto"
    endpoints = {
      s3 = "https://e1fe0f0ce8ff18da4edc118372c30022.r2.cloudflarestorage.com"
    }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = false
    use_lockfile                = true
  }
}
EOF
```

- [ ] **Step 4: Write new versions.tf**

```bash
cat > infra/terraform/envs/prod/versions.tf <<'EOF'
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}
EOF
```

- [ ] **Step 5: Update terraform.tfvars (variables sourced from env)**

```bash
cat > infra/terraform/envs/prod/terraform.tfvars <<'EOF'
# Variables for channel-atoms prod environment.
# Both values are also accepted from environment:
#   TF_VAR_cloudflare_account_id
#   TF_VAR_zone_id
#
# Set them in your shell or in CI as secrets.
EOF
```

- [ ] **Step 6: Delete empty modules dir if present**

```bash
if [[ -d infra/terraform/modules ]] && [[ "$(ls infra/terraform/modules/)" == ".keep" ]]; then
  git rm -r infra/terraform/modules
fi
```

- [ ] **Step 7: Commit refactor**

```bash
git add infra/terraform/envs/prod/main.tf \
        infra/terraform/envs/prod/backend.tf \
        infra/terraform/envs/prod/versions.tf \
        infra/terraform/envs/prod/terraform.tfvars
git status -s
git commit -m "feat(infra): wire prod TF for Cloudflare Pages provisioning

Replaces template stub with core-infra pages-project module reference.
Backend points to cs-tfstate R2 bucket with per-catalog key. Provider
pinned to cloudflare ~> 5.0. Module sourced at v0.1.0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 2.2: tofu apply channel-atoms

**Repo:** `channel-atoms`

- [ ] **Step 1: Look up the zone_id for channel-atoms.com**

```bash
# CLOUDFLARE_API_TOKEN must be set; this is presence-only check
test -n "${CLOUDFLARE_API_TOKEN-}" && echo "token set" || echo "TOKEN MISSING — set it"

# Look up the zone ID. The output contains the ID — capture into env var, do not paste it elsewhere.
ZONE_ID=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                  -H "Content-Type: application/json" \
                  "https://api.cloudflare.com/client/v4/zones?name=channel-atoms.com" \
            | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"][0]["id"])')
test -n "$ZONE_ID" && echo "zone resolved" || echo "ZONE LOOKUP FAILED"
export TF_VAR_zone_id="$ZONE_ID"
```

If zone lookup fails: the domain may not yet be added to the Cloudflare account, or the API token may lack `Zone → Read` scope. Resolve before continuing.

- [ ] **Step 2: Set cloudflare_account_id env**

```bash
# Manually set this from your shell profile / 1Password / Cloudflare dashboard.
# The variable name TF_VAR_cloudflare_account_id maps to the var.cloudflare_account_id in main.tf.
export TF_VAR_cloudflare_account_id="<your-cloudflare-account-id>"
```

- [ ] **Step 3: Init the new prod env**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms/infra/terraform/envs/prod
tofu init
```

Expected: "Downloading git::https://github.com/convergent-systems-co/core-infra.git ..." + "OpenTofu has been successfully initialized!"

- [ ] **Step 4: Plan**

```bash
tofu plan
```

Expected output excerpt:

```
Plan: 3 to add, 0 to change, 0 to destroy.

  + cloudflare_pages_project.this (channel-atoms)
  + cloudflare_pages_domain.custom[0] (channel-atoms.com)
  + cloudflare_dns_record.pages_cname[0] (channel-atoms.com CNAME → channel-atoms.pages.dev)
```

If the plan shows anything else (especially deletions), STOP and investigate.

- [ ] **Step 5: Apply**

```bash
tofu apply -auto-approve
```

Wait for completion. Expected:

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:
custom_domain = "channel-atoms.com"
subdomain     = "channel-atoms.pages.dev"
```

- [ ] **Step 6: Verify Cloudflare side**

```bash
# Project exists:
curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${TF_VAR_cloudflare_account_id}/pages/projects/channel-atoms" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("status:", d.get("success"), "name:", d.get("result", {}).get("name"))'

# DNS record exists (look for channel-atoms.com CNAME):
curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${TF_VAR_zone_id}/dns_records?name=channel-atoms.com&type=CNAME" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]; print("records:", len(d), "proxied:", d[0]["proxied"] if d else "none")'
```

Expected: project status `True`, name `channel-atoms`. DNS records `1`, proxied `True`.

## Task 2.3: Update channel-atoms release.yml to deploy via wrangler

**Repo:** `channel-atoms`

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Read the existing release.yml**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms
cat .github/workflows/release.yml
```

- [ ] **Step 2: Replace the deploy step (or write new workflow)**

Replace the file contents with:

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: read
  deployments: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        working-directory: web
        run: npm ci

      - name: Build site
        working-directory: web
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy web/dist --project-name=channel-atoms
```

Write this via your editor or:

```bash
cat > .github/workflows/release.yml <<'EOF'
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: read
  deployments: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        working-directory: web
        run: npm ci

      - name: Build site
        working-directory: web
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy web/dist --project-name=channel-atoms
EOF
```

- [ ] **Step 3: Verify org-level secrets are accessible**

```bash
gh secret list --repo convergent-systems-co/channel-atoms
```

Expected output includes `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (inherited from org). If either is missing, the repo's secret-inheritance settings need a fix before this PR can deploy successfully.

- [ ] **Step 4: Commit + push + PR**

```bash
git add .github/workflows/release.yml
git commit -m "feat(ci): deploy to Cloudflare Pages on merge to main

Replaces template stub with a real wrangler-based deploy targeting the
channel-atoms Pages project (created by infra/terraform/envs/prod
tofu apply).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/provision-pages
gh pr create --repo convergent-systems-co/channel-atoms \
  --title "feat: provision channel-atoms.com Cloudflare Pages + CI deploy" \
  --body "## Summary
- Wires \`infra/terraform/envs/prod/\` to provision the channel-atoms Cloudflare Pages project, custom domain, and DNS record via the core-infra pages-project module (v0.1.0).
- Updates \`release.yml\` to deploy site content to the project on every merge to main.

The Pages project, domain attachment, and DNS record were already created by \`tofu apply\` before this PR — merging triggers the first deploy.

## Test plan
- [ ] CI green
- [ ] Wrangler deploy step succeeds
- [ ] https://channel-atoms.com returns 200 OK after merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

## Task 2.4: Merge, verify site is live

**Repo:** `channel-atoms` + `atoms` (umbrella pointer bump)

- [ ] **Step 1: Wait for CI; merge**

```bash
gh pr checks --repo convergent-systems-co/channel-atoms --watch
gh pr merge --repo convergent-systems-co/channel-atoms --merge --delete-branch
```

- [ ] **Step 2: Verify deploy ran**

```bash
gh run list --repo convergent-systems-co/channel-atoms --workflow release --limit 1
```

Expected: latest run completed with `success`.

- [ ] **Step 3: Curl the site**

```bash
curl -sI https://channel-atoms.com | head -1
```

Expected: `HTTP/2 200` (or `HTTP/1.1 200 OK`). DNS may take 60-180s to propagate; if you get a connection error, wait and re-try.

- [ ] **Step 4: Bump umbrella submodule pointer**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git submodule update --remote src/channel-atoms
git switch -c chore/bump-channel-atoms-pages
git add src/channel-atoms
git commit -m "chore: bump channel-atoms to provisioned-pages main"
git push -u origin chore/bump-channel-atoms-pages
gh pr create --repo convergent-systems-co/atoms \
  --title "chore: bump channel-atoms (pages provisioned)" \
  --body "channel-atoms.com is now live."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

- [ ] **Step 5: PAUSE — confirm Phase 2 with user before Phase 3**

This is a hard gate. Verify with the user that channel-atoms.com is responding correctly before continuing to theme-atoms (production-site import).

---

# PHASE 3 — Pilot 2: theme-atoms IMPORT (production site)

## Task 3.1: Refactor theme-atoms TF to target pattern

**Repo:** `theme-atoms` (submodule)

This is identical to Task 2.1 except:
- Substitute `channel-atoms` → `theme-atoms` everywhere
- Substitute `channel-atoms.com` → `theme-atoms.com`
- Project name: `theme-atoms`
- Backend key: `state-bucket/convergent-systems-co/theme-atoms/pages-project.tfstate`

- [ ] **Step 1: Branch theme-atoms**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms
git fetch origin && git switch main && git pull origin main
git switch -c feat/import-pages
```

- [ ] **Step 2: Refactor main.tf, backend.tf, versions.tf, terraform.tfvars per Task 2.1 pattern with theme-atoms substitutions**

Copy the four files from Task 2.1, substituting `channel-atoms` → `theme-atoms` everywhere. Use the same here-doc approach. Do NOT commit yet.

- [ ] **Step 3: tofu init (do NOT apply)**

```bash
cd infra/terraform/envs/prod
export TF_VAR_cloudflare_account_id="<account-id>"
ZONE_ID=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            "https://api.cloudflare.com/client/v4/zones?name=theme-atoms.com" \
            | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"][0]["id"])')
export TF_VAR_zone_id="$ZONE_ID"
tofu init
```

Expected: init succeeds. Plan would create 3 resources — but we MUST NOT apply; we import instead.

## Task 3.2: Import existing Cloudflare resources into TF state

**Repo:** `theme-atoms`

- [ ] **Step 1: Import Pages project**

```bash
tofu import module.pages_project.cloudflare_pages_project.this \
    "${TF_VAR_cloudflare_account_id}/theme-atoms"
```

Expected: "Import successful!"

If the import fails with "Cannot import non-existent remote object" — the live project name doesn't match `theme-atoms`. Look it up:

```bash
curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${TF_VAR_cloudflare_account_id}/pages/projects" \
  | python3 -c 'import sys,json; [print(p["name"]) for p in json.load(sys.stdin)["result"]]'
```

Use the actual project name in the import command.

- [ ] **Step 2: Import custom domain attachment**

```bash
tofu import 'module.pages_project.cloudflare_pages_domain.custom[0]' \
    "${TF_VAR_cloudflare_account_id}/theme-atoms/theme-atoms.com"
```

Expected: "Import successful!"

- [ ] **Step 3: Look up the DNS record ID and import it**

```bash
RECORD_ID=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
              "https://api.cloudflare.com/client/v4/zones/${TF_VAR_zone_id}/dns_records?name=theme-atoms.com&type=CNAME" \
              | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"][0]["id"])')
test -n "$RECORD_ID" && echo "record id resolved" || echo "LOOKUP FAILED — DNS record may not exist"

tofu import "module.pages_project.cloudflare_dns_record.pages_cname[0]" \
    "${TF_VAR_zone_id}/${RECORD_ID}"
```

Expected: "Import successful!"

## Task 3.3: CRITICAL — verify plan is empty

**Repo:** `theme-atoms`

- [ ] **Step 1: tofu plan**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms/infra/terraform/envs/prod
tofu plan
```

Expected output:

```
No changes. Your infrastructure matches the configuration.
```

**If the plan shows any changes, STOP.** Common drift cases:

| Plan shows | Likely cause | Fix |
|---|---|---|
| `~ build_config { ... }` | Live project has build settings the module doesn't know about | Pass matching build config via additional module inputs, or null out the live attributes |
| `~ proxied = false → true` | Live DNS record is not proxied; module defaults to proxied=true | Decide: leave proxied or change. If change, get user approval (changes traffic flow) |
| `+ cloudflare_pages_project.this` | Import didn't take | Re-run Task 3.2 Step 1; check the project name |
| `- cloudflare_pages_domain.custom[0]` | Import was for wrong domain | State rm + re-import with correct domain |

Resolve drift before continuing.

- [ ] **Step 2: Capture plan output for PR body**

```bash
tofu plan -no-color > /tmp/theme-atoms-plan.txt
head -20 /tmp/theme-atoms-plan.txt
```

This output is pasted into the PR body in Task 3.4.

## Task 3.4: Commit, PR, merge

**Repo:** `theme-atoms`

- [ ] **Step 1: Commit the TF refactor**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms
git add infra/terraform/envs/prod/main.tf \
        infra/terraform/envs/prod/backend.tf \
        infra/terraform/envs/prod/versions.tf \
        infra/terraform/envs/prod/terraform.tfvars
git commit -m "feat(infra): bring existing Pages project under TF management

theme-atoms.com Pages project + custom domain + DNS record existed
before this work (managed manually via wrangler / Cloudflare dashboard).
This PR imports them into Terraform state without recreating them.

Plan verified empty after import. See PR body for the empty-plan output.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/import-pages
```

- [ ] **Step 2: Open PR with empty-plan attestation**

```bash
gh pr create --repo convergent-systems-co/theme-atoms \
  --title "feat(infra): import existing Pages project into TF" \
  --body "$(cat <<'EOF'
## Summary
Brings theme-atoms.com's existing Cloudflare Pages project, custom domain, and DNS record under Terraform management without recreating them.

## Plan output (verified empty after import)

\`\`\`
$(cat /tmp/theme-atoms-plan.txt | head -10)
\`\`\`

## Test plan
- [ ] CI green
- [ ] Cloudflare dashboard shows project still healthy
- [ ] theme-atoms.com still returns 200 (no traffic interruption)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI, merge**

```bash
gh pr checks --repo convergent-systems-co/theme-atoms --watch
gh pr merge --repo convergent-systems-co/theme-atoms --merge --delete-branch
```

- [ ] **Step 4: Bump umbrella submodule pointer**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git submodule update --remote src/theme-atoms
git switch -c chore/bump-theme-pages-import
git add src/theme-atoms
git commit -m "chore: bump theme-atoms (pages now TF-managed)"
git push -u origin chore/bump-theme-pages-import
gh pr create --title "chore: bump theme-atoms (pages now TF-managed)" --body "theme-atoms.com Pages project is now imported under TF management."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

- [ ] **Step 5: PAUSE — verify theme-atoms.com still serves**

```bash
curl -sI https://theme-atoms.com | head -1
```

Expected: `HTTP/2 200`. If you see a non-200 or a connection error, the import has affected traffic — investigate the Cloudflare dashboard.

- [ ] **Step 6: Confirm with user before Phase 4**

---

# PHASE 4 — Scale to 12 remaining catalogs

This phase parallelizes the Task 2 pattern across 12 catalogs in two batches of 6. Each catalog is a clean `tofu apply` (no import).

## Task 4.1: Batch 1 — compliance, event, identity, knowledge, model, persona

These 6 catalogs are dispatched as 6 parallel subagents. Each subagent performs Tasks 2.1 through 2.4 for its assigned catalog, substituting the catalog name.

- [ ] **Step 1: Dispatch 6 parallel subagents**

For each catalog `<C>` in `[compliance-atoms, event-atoms, identity-atoms, knowledge-atoms, model-atoms, persona-atoms]`, dispatch a subagent with the following instructions (paraphrased — provide full Task 2.1-2.4 text per subagent):

```
Apply Tasks 2.1-2.4 to catalog <C>. Substitute "channel-atoms" → "<C>" throughout.
Pre-authorized to push, PR, merge once CI green.
Stop and report BLOCKED on:
  - tofu plan showing anything except "3 to add, 0 to change, 0 to destroy"
  - wrangler deploy step failure
  - curl https://<C>.com returning non-200 after 3-minute wait
Report: PR number, merge SHA, tofu apply output, post-deploy curl status.
```

- [ ] **Step 2: Wait for all 6 subagent reports**

- [ ] **Step 3: Bump umbrella submodule pointers for Batch 1**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git submodule update --remote src/compliance-atoms src/event-atoms src/identity-atoms \
                              src/knowledge-atoms src/model-atoms src/persona-atoms
git switch -c chore/bump-phase4-batch-1
git add src/compliance-atoms src/event-atoms src/identity-atoms \
        src/knowledge-atoms src/model-atoms src/persona-atoms
git commit -m "chore: bump phase 4 batch 1 submodules (pages provisioned)"
git push -u origin chore/bump-phase4-batch-1
gh pr create --title "chore: bump phase 4 batch 1 (6 catalogs live)" --body "6 catalogs provisioned and live."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

## Task 4.2: Batch 2 — plugin, policy, service, workflow, agent, prompt

- [ ] **Step 1: Dispatch 6 parallel subagents for [plugin-atoms, policy-atoms, service-atoms, workflow-atoms, agent-atoms, prompt-atoms]**

Note: `agent-atoms` and `prompt-atoms` are Band A by template-alignment classification but their Pages projects don't exist (they were never deployed). They go through clean apply (not import). Same instructions as Task 4.1.

- [ ] **Step 2: Wait for all 6 subagent reports**

- [ ] **Step 3: Bump umbrella submodule pointers for Batch 2**

Same pattern as Task 4.1 Step 3 with the Batch 2 catalogs and branch name `chore/bump-phase4-batch-2`.

---

# PHASE 5 — brand-atoms import + profile-atoms apply

## Task 5.1: brand-atoms IMPORT

**Repo:** `brand-atoms` (submodule)

This follows the Task 3 (theme-atoms) import pattern exactly. Substitute `theme-atoms` → `brand-atoms` and `theme-atoms.com` → `brand-atoms.com`.

- [ ] **Step 1: Repeat Tasks 3.1, 3.2, 3.3, 3.4 with brand-atoms substitutions**

Same `tofu import` sequence — Pages project + custom domain + DNS record. Same empty-plan checkpoint. Same PR pattern.

- [ ] **Step 2: Verify brand-atoms.com still serves**

```bash
curl -sI https://brand-atoms.com | head -1
```

Expected: `HTTP/2 200`.

- [ ] **Step 3: Bump umbrella submodule pointer**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git submodule update --remote src/brand-atoms
git switch -c chore/bump-brand-pages-import
git add src/brand-atoms
git commit -m "chore: bump brand-atoms (pages now TF-managed)"
git push -u origin chore/bump-brand-pages-import
gh pr create --title "chore: bump brand-atoms (pages now TF-managed)" --body "brand-atoms.com Pages project is now imported under TF management."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

## Task 5.2: profile-atoms APPLY

**Repo:** `profile-atoms` (submodule)

profile-atoms is Band A by template-alignment classification but its Pages project does not exist. Clean apply, like channel-atoms.

- [ ] **Step 1: Repeat Tasks 2.1-2.4 with profile-atoms substitutions**

- [ ] **Step 2: Verify profile-atoms.com**

```bash
curl -sI https://profile-atoms.com | head -1
```

Expected: `HTTP/2 200`.

- [ ] **Step 3: Bump umbrella submodule pointer**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git submodule update --remote src/profile-atoms
git switch -c chore/bump-profile-pages
git add src/profile-atoms
git commit -m "chore: bump profile-atoms (pages provisioned)"
git push -u origin chore/bump-profile-pages
gh pr create --title "chore: bump profile-atoms (pages provisioned)" --body "profile-atoms.com is now live."
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

---

# PHASE 6 — Verification + xdao deprecation note

## Task 6.1: Add scripts/verify-sites-online.sh

**Repo:** `atoms`

**Files:**
- Create: `scripts/verify-sites-online.sh`

- [ ] **Step 1: Branch atoms umbrella**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git switch -c chore/verify-sites-online
```

- [ ] **Step 2: Write the verifier**

```bash
cat > scripts/verify-sites-online.sh <<'EOF'
#!/usr/bin/env bash
# verify-sites-online.sh — check that all 16 *-atoms.com sites return 200 OK
# See docs/superpowers/specs/2026-05-22-atoms-site-provisioning-design.md
set -u

DOMAINS=(
  agent-atoms.com brand-atoms.com channel-atoms.com compliance-atoms.com
  event-atoms.com identity-atoms.com knowledge-atoms.com model-atoms.com
  persona-atoms.com plugin-atoms.com policy-atoms.com profile-atoms.com
  prompt-atoms.com service-atoms.com theme-atoms.com workflow-atoms.com
)

fail_count=0
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; fail_count=$((fail_count + 1)); }

echo "Checking 16 *-atoms.com sites..."
for d in "${DOMAINS[@]}"; do
  code=$(curl -sI -o /dev/null -w "%{http_code}" "https://$d" || echo "000")
  if [[ "$code" == "200" ]]; then
    pass "https://$d → 200"
  else
    fail "https://$d → $code"
  fi
done

echo
if [[ $fail_count -eq 0 ]]; then
  echo "ALL 16 SITES LIVE"
  exit 0
else
  echo "$fail_count SITES NOT LIVE"
  exit 1
fi
EOF
chmod +x scripts/verify-sites-online.sh
```

- [ ] **Step 3: Run the verifier**

```bash
bash scripts/verify-sites-online.sh
```

Expected:

```
ALL 16 SITES LIVE
```

If any site fails, investigate before merging the verifier PR.

- [ ] **Step 4: Commit, PR, merge**

```bash
git add scripts/verify-sites-online.sh
git commit -m "chore: add verify-sites-online.sh

Checks every *-atoms.com returns 200 OK. Run after any provisioning
change to confirm no site has gone dark.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin chore/verify-sites-online
gh pr create --repo convergent-systems-co/atoms \
  --title "chore: add verify-sites-online.sh" \
  --body "One-shot verifier for all 16 *-atoms.com sites. Currently all PASS."
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main && git pull origin main
```

## Task 6.2: File xdao deprecation issue

**Repo:** `xdao`

- [ ] **Step 1: File the deprecation tracking issue**

```bash
gh issue create --repo convergent-systems-co/xdao \
  --title "Archive xdao — atoms.convergent-systems.co is the canonical federation" \
  --body "$(cat <<'EOF'
## Decision

Per the brainstorming session of 2026-05-22 (atoms site provisioning plan), \`atoms.convergent-systems.co\` is the canonical federation portal for the *-atoms catalog ecosystem. \`xdao\` overlaps with that role and should be deprecated.

## Action items

- [ ] Decide on disposition: archive vs repurpose (e.g., XDAO Improvement Proposals only)
- [ ] If archive: update repo README with a redirect notice; archive on GitHub
- [ ] If repurpose: scope the new responsibility; update GOALS.md
- [ ] Update any external links pointing at xdao.co
- [ ] Move any unique content (governance pages, proposals) to either atoms.convergent-systems.co or xaips

## References

- atoms site provisioning design: convergent-systems-co/atoms \`docs/superpowers/specs/2026-05-22-atoms-site-provisioning-design.md\` §12 Out of scope
- atoms GOALS.md mentions atoms.convergent-systems.co as the "catalog of catalog"
EOF
)"
```

- [ ] **Step 2: Capture the issue number; reference it in the atoms umbrella's CHANGELOG**

Not blocking — but if there's an active CHANGELOG.md in atoms umbrella, add a line under "Unreleased":

```markdown
- chore: filed xdao deprecation issue convergent-systems-co/xdao#N (atoms.convergent-systems.co is canonical federation)
```

## Task 6.3: Final success-criteria sweep

**Repo:** `atoms`

- [ ] **Step 1: Run verify-sites-online.sh**

```bash
bash scripts/verify-sites-online.sh
```

Expected: ALL 16 SITES LIVE.

- [ ] **Step 2: Verify SC-3 — each catalog's tofu plan is empty**

```bash
for c in agent brand channel compliance event identity knowledge model persona plugin policy profile prompt service theme workflow; do
  echo "=== $c-atoms ==="
  cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/$c-atoms/infra/terraform/envs/prod
  tofu plan -detailed-exitcode > /tmp/plan-$c.txt 2>&1
  case $? in
    0) echo "  PASS: empty plan" ;;
    1) echo "  FAIL: plan errored"; head -20 /tmp/plan-$c.txt ;;
    2) echo "  FAIL: plan has changes"; head -20 /tmp/plan-$c.txt ;;
  esac
done
```

Expected: all 16 PASS.

- [ ] **Step 3: Verify SC-6 — module sourced from core-infra at pinned tag**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
for c in agent brand channel compliance event identity knowledge model persona plugin policy profile prompt service theme workflow; do
  if grep -q "git::https://github.com/convergent-systems-co/core-infra" src/$c-atoms/infra/terraform/envs/prod/main.tf; then
    echo "PASS: $c-atoms uses core-infra"
  else
    echo "FAIL: $c-atoms does not use core-infra module"
  fi
done
```

Expected: all 16 PASS.

- [ ] **Step 4: Final summary to user**

Report:
- 16 catalog repos provisioned (13 new + 2 imported + umbrella unchanged)
- ~32 PRs merged across catalog repos + umbrella + core-infra
- All 16 *-atoms.com domains return 200 OK
- All 16 tofu plans empty (no drift)
- All 16 reference core-infra v0.1.0 pages-project module
- xdao deprecation tracked in convergent-systems-co/xdao#N

---

## Self-Review Notes

### Spec coverage

| Spec section | Plan task(s) |
|---|---|
| §1 Objective | Phases 0-6 collectively |
| §2 Rationale + Alternatives | Resolved at spec; plan executes chosen option A |
| §3 Architecture | Tasks 0.1-0.4 (module move), 1.1-1.2 (OpenTofu) |
| §4 Module migration | Tasks 0.1-0.4 |
| §5 Per-catalog TF refactor | Task 2.1 (channel-atoms pattern); repeats in 3.1, 4.1, 4.2, 5.1, 5.2 |
| §6 Import flow | Tasks 3.1-3.4 (theme), 5.1 (brand) |
| §7 CI deploy trigger | Task 2.3 (channel-atoms release.yml); repeats per catalog |
| §8 Rollout phases | Maps 1:1 to plan Phases 0-6 |
| §9 SC-1..SC-9 | Tasks 2.4, 6.1, 6.3 (verifier + sweep) |
| §10 Risk mitigation | Empty-plan checkpoint (Task 3.3), per-catalog PR review |
| §11 Dependencies | Pre-flight gates at top of plan |
| §12 Out of scope | Task 6.2 (xdao tracking issue) |

### Placeholder check

- `<your-cloudflare-account-id>` in Task 2.2 Step 2: documented as an env-var the operator sets. Not a TBD.
- `<C>` in batch loops (Tasks 1.2 Step 1, 4.1, 4.2): explicit substitution variable across enumerated catalog list. Not a TBD.
- `<account-id>` in Task 3.1 Step 3: same as above.
- `record_id` is looked up live via Cloudflare API (Task 3.2 Step 3); the variable is set at command-time, not a placeholder.
- PR numbers `#N` in PR bodies (Tasks 3.4 Step 2, 6.2): filled in at create-time. Plan steps include the lookup command. Acceptable.

### Type consistency

- Variable name `cloudflare_account_id` used consistently across all main.tf files
- Backend key pattern: `state-bucket/convergent-systems-co/<catalog>-atoms/pages-project.tfstate` — used identically in §3 spec, Task 2.1 Step 3, all subsequent catalog tasks
- Module source path with tag `v0.1.0` used identically across all main.tf rewrites
- Project name `<catalog>-atoms` matches in both `module.pages_project { project_name = "<C>-atoms" }` (TF) and `command: pages deploy web/dist --project-name=<C>-atoms` (workflow). Matched explicitly per catalog.

### Open items deliberately left to executor judgment

- The exact format of build_config attributes during theme/brand import (Task 3.3) — depends on what's actually configured live. Runbook tip provided.
- Whether to use `pnpm` or `npm` in the new release.yml — Band A catalogs are pnpm, Band B (channel, etc.) are npm. Task 2.3 uses npm because channel-atoms is Band B; theme/brand/agent/prompt/profile will need pnpm. Note added to each per-catalog dispatch via the subagent prompt.
