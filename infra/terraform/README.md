# Terraform infrastructure

## Layout

- `modules/pages-project/` — Cloudflare Pages module that provisions the umbrella site.
  Direct-upload deploy; no Git-source binding.
- `envs/dev/` — scaffolded dev environment (no live deploy yet).
- `envs/prod/` — production environment. Provisions `atoms-umbrella` Pages project;
  the custom domain `atoms.convergent-systems.co` is attached out-of-band in the Cloudflare dashboard.

## State

Production state lives in the R2 bucket `cs-tfstate` at
`state-bucket/convergent-systems-co/atoms/pages-project.tfstate`. See `envs/prod/backend.tf`.
Locking via R2 native object-lock (`use_lockfile = true`).

## Usage

```
make tf-init  ENV=prod
make tf-plan  ENV=prod
make tf-apply ENV=prod
```

Credentials follow `~/.ai/Common.md §4` — env vars only, never in code. AWS-compatible credentials
for the R2 backend come from `~/.env/convergent-systems.co/.env`.

## Adding an env

1. `mkdir -p infra/terraform/envs/<name>`
2. Copy `envs/prod/{backend,main,versions,terraform.tfvars}.tf` and adjust the backend key,
   `project_name`, and any env-specific variables.
3. Update `.github/workflows/tf-plan.yml` matrix.
