# Terraform Pages Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `infra/cloudflare/pages-project/` Terraform module to `theme-atoms` and `brand-atoms`, mirroring the pattern from `prompt-atoms`, closing issue #2.

**Architecture:** One root Terraform module per catalog at `infra/cloudflare/pages-project/`. R2 S3 backend with per-catalog state key. Direct-upload Pages project (Wrangler deploys from CI, no Git integration). Credentials from environment — no secrets in code.

**Tech Stack:** OpenTofu ≥ 1.6.0, Cloudflare provider `~> 5.0`, R2 S3 backend (`cs-tfstate`)

**Repos:** `convergent-systems-co/theme-atoms`, `convergent-systems-co/brand-atoms`

**Prerequisites:**
- `CLOUDFLARE_API_TOKEN` with `Pages — Edit` scope available in the shell
- R2 backend credentials as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (from `~/.env/convergent-systems.co/.env`)
- Cloudflare account ID: `e1fe0f0ce8ff18da4edc118372c30022`

---

## Task 1: Add Terraform module to theme-atoms

**Files to create:**
- `infra/cloudflare/pages-project/versions.tf`
- `infra/cloudflare/pages-project/providers.tf`
- `infra/cloudflare/pages-project/variables.tf`
- `infra/cloudflare/pages-project/main.tf`
- `infra/cloudflare/pages-project/outputs.tf`
- `infra/cloudflare/pages-project/terraform.tfvars.example`
- `infra/cloudflare/pages-project/README.md`

- [ ] **Clone theme-atoms**

```bash
cd /tmp
GH_TOKEN=$(gh auth token --user polliard) \
  git clone https://github.com/convergent-systems-co/theme-atoms.git
cd theme-atoms
git config --local credential.helper \
  '!f() { test "$1" = get && printf "username=polliard\npassword=%s\n" "$(gh auth token --user polliard)"; }; f'
git checkout -b feat/terraform-pages-project
mkdir -p infra/cloudflare/pages-project
```

- [ ] **Write `infra/cloudflare/pages-project/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "cs-tfstate"
    key    = "state-bucket/convergent-systems-co/theme-atoms/pages-project.tfstate"
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
```

- [ ] **Write `infra/cloudflare/pages-project/providers.tf`**

```hcl
# CLOUDFLARE_API_TOKEN env var — required scopes: Account: Cloudflare Pages (Edit)
provider "cloudflare" {}
```

- [ ] **Write `infra/cloudflare/pages-project/variables.tf`**

```hcl
variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name."
  type        = string
  default     = "theme-atoms"
}

variable "production_branch" {
  description = "Branch that triggers production deployments."
  type        = string
  default     = "main"
}
```

- [ ] **Write `infra/cloudflare/pages-project/main.tf`**

```hcl
# Direct-upload Pages project. Deployments come from wrangler pages deploy
# in .github/workflows/deploy.yml — not from a Pages-managed Git integration.
resource "cloudflare_pages_project" "this" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch
}
```

- [ ] **Write `infra/cloudflare/pages-project/outputs.tf`**

```hcl
output "project_name" {
  description = "Cloudflare Pages project name."
  value       = cloudflare_pages_project.this.name
}

output "subdomain" {
  description = "Default Pages subdomain (theme-atoms.pages.dev)."
  value       = cloudflare_pages_project.this.subdomain
}

output "created_on" {
  description = "Project creation timestamp."
  value       = cloudflare_pages_project.this.created_on
}
```

- [ ] **Write `infra/cloudflare/pages-project/terraform.tfvars.example`**

```hcl
# Copy to terraform.tfvars before running plan/apply.
# Or export TF_VAR_cloudflare_account_id=<id>

cloudflare_account_id = "<convergent-systems-co account id>"
# project_name      = "theme-atoms"
# production_branch = "main"
```

- [ ] **Write `infra/cloudflare/pages-project/README.md`**

```markdown
# theme-atoms — Cloudflare Pages Project

Manages the `theme-atoms` Cloudflare Pages project via OpenTofu.

## Usage

```bash
cd infra/cloudflare/pages-project
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with the Cloudflare account ID
source ~/.env/convergent-systems.co/.env
tofu init
tofu plan
tofu apply
```

## State

R2 bucket: `cs-tfstate`
Key: `state-bucket/convergent-systems-co/theme-atoms/pages-project.tfstate`

## Import existing project

If the Pages project already exists in Cloudflare:

```bash
tofu import cloudflare_pages_project.this <account_id>/theme-atoms
```
```

- [ ] **Validate Terraform syntax**

```bash
cd infra/cloudflare/pages-project
tofu fmt -check .
```
Expected: no output (all files already formatted). If output appears, run `tofu fmt .` and re-check.

- [ ] **Commit**

```bash
git add infra/cloudflare/
git commit -m "feat(infra): add cloudflare pages-project Terraform module"
```

---

## Task 2: Init and import existing theme-atoms Pages project

- [ ] **Source backend credentials**

```bash
source ~/.env/convergent-systems.co/.env
```

Verify with: `test -n "${AWS_ACCESS_KEY_ID-}" && echo "OK"`. Expected: `OK`.

- [ ] **Create terraform.tfvars**

```bash
cat > terraform.tfvars <<'EOF'
cloudflare_account_id = "e1fe0f0ce8ff18da4edc118372c30022"
EOF
```

- [ ] **tofu init**

```bash
tofu init
```
Expected: `Terraform has been successfully initialized!`

- [ ] **Import existing Pages project**

```bash
tofu import cloudflare_pages_project.this e1fe0f0ce8ff18da4edc118372c30022/theme-atoms
```
Expected: `Import successful!` If the project name in Cloudflare differs from `theme-atoms`, substitute the actual name.

- [ ] **Verify plan shows no changes**

```bash
tofu plan
```
Expected: `No changes. Your infrastructure matches the configuration.` If it shows changes (e.g., `production_branch`), apply them: `tofu apply`.

- [ ] **Push PR and merge**

```bash
cd /tmp/theme-atoms
GH_TOKEN=$(gh auth token --user polliard) git push -u origin feat/terraform-pages-project
GH_TOKEN=$(gh auth token --user polliard) gh pr create \
  --base main \
  --title "feat(infra): add Terraform module for Cloudflare Pages project" \
  --body "$(cat <<'EOF'
## Summary

- Add `infra/cloudflare/pages-project/` module mirroring prompt-atoms pattern
- State key: `state-bucket/convergent-systems-co/theme-atoms/pages-project.tfstate`
- Import existing hand-created Pages project into state

## Test plan

- [x] `tofu fmt -check` passes
- [x] `tofu init` succeeds
- [x] `tofu import` succeeds
- [x] `tofu plan` shows no changes after import

Closes #2 (partial — theme-atoms)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
GH_TOKEN=$(gh auth token --user polliard) gh pr merge --merge --repo convergent-systems-co/theme-atoms
```

---

## Task 3: Add Terraform module to brand-atoms

Same steps as Tasks 1–2 but for `brand-atoms`. Only the catalog-specific values differ.

- [ ] **Clone brand-atoms**

```bash
cd /tmp
GH_TOKEN=$(gh auth token --user polliard) \
  git clone https://github.com/convergent-systems-co/brand-atoms.git
cd brand-atoms
git config --local credential.helper \
  '!f() { test "$1" = get && printf "username=polliard\npassword=%s\n" "$(gh auth token --user polliard)"; }; f'
git checkout -b feat/terraform-pages-project
mkdir -p infra/cloudflare/pages-project
```

- [ ] **Write the 7 module files** — identical to theme-atoms except:
  - `versions.tf` → key = `"state-bucket/convergent-systems-co/brand-atoms/pages-project.tfstate"`
  - `variables.tf` → `default = "brand-atoms"` for `project_name`
  - `terraform.tfvars.example` → comment says `brand-atoms`
  - `README.md` → s/theme-atoms/brand-atoms/g

  Write `infra/cloudflare/pages-project/versions.tf`:
  ```hcl
  terraform {
    required_version = ">= 1.6.0"
    required_providers {
      cloudflare = {
        source  = "cloudflare/cloudflare"
        version = "~> 5.0"
      }
    }
    backend "s3" {
      bucket = "cs-tfstate"
      key    = "state-bucket/convergent-systems-co/brand-atoms/pages-project.tfstate"
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
  ```

  `providers.tf`, `main.tf`, `outputs.tf` — identical to theme-atoms.

  `variables.tf`:
  ```hcl
  variable "cloudflare_account_id" {
    description = "Cloudflare account ID that owns the Pages project."
    type        = string
  }
  variable "project_name" {
    description = "Cloudflare Pages project name."
    type        = string
    default     = "brand-atoms"
  }
  variable "production_branch" {
    description = "Branch that triggers production deployments."
    type        = string
    default     = "main"
  }
  ```

  `terraform.tfvars.example`:
  ```hcl
  cloudflare_account_id = "<convergent-systems-co account id>"
  # project_name      = "brand-atoms"
  # production_branch = "main"
  ```

- [ ] **Validate, init, import, plan**

```bash
cd infra/cloudflare/pages-project
tofu fmt -check .
source ~/.env/convergent-systems.co/.env
cat > terraform.tfvars <<'EOF'
cloudflare_account_id = "e1fe0f0ce8ff18da4edc118372c30022"
EOF
tofu init
tofu import cloudflare_pages_project.this e1fe0f0ce8ff18da4edc118372c30022/brand-atoms
tofu plan
```
Expected: `No changes.` after import.

- [ ] **Commit, push PR, merge**

```bash
cd /tmp/brand-atoms
git add infra/cloudflare/
git commit -m "feat(infra): add Terraform module for Cloudflare Pages project"
GH_TOKEN=$(gh auth token --user polliard) git push -u origin feat/terraform-pages-project
GH_TOKEN=$(gh auth token --user polliard) gh pr create \
  --base main \
  --title "feat(infra): add Terraform module for Cloudflare Pages project" \
  --body "$(cat <<'EOF'
## Summary

- Add infra/cloudflare/pages-project/ module (mirrors prompt-atoms pattern)
- State key: state-bucket/convergent-systems-co/brand-atoms/pages-project.tfstate
- Import existing Pages project into state

Closes #2 (partial — brand-atoms)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
GH_TOKEN=$(gh auth token --user polliard) gh pr merge --merge --repo convergent-systems-co/brand-atoms
```
