# pages-project module

Cloudflare Pages module that hosts the umbrella catalog directory site (and any sibling per-env Pages project). Direct-upload — deployments arrive via `wrangler pages deploy` in `.github/workflows/deploy.yml`, no Git-source binding.

## What it creates

| Resource | When | What |
|---|---|---|
| `cloudflare_pages_project.this` | always | The Pages project (default URL: `https://<project_name>.pages.dev`). |
| `cloudflare_pages_domain.custom` | when `var.custom_domain != ""` | Attaches the custom hostname to the Pages project. |
| `cloudflare_dns_record.pages_cname` | when `var.custom_domain != ""` and `var.zone_id != ""` | Proxied CNAME pointing the custom domain at `<project_name>.pages.dev`. |

The two optional resources are gated on `custom_domain` + `zone_id`; leaving them empty produces a Pages-only deploy (subdomain `*.pages.dev`).

## Inputs

| Variable | Required | Default | Description |
|---|---|---|---|
| `cloudflare_account_id` | yes | — | Cloudflare account ID. |
| `project_name` | no | `atoms-umbrella` | Pages project name. |
| `production_branch` | no | `main` | Branch that triggers prod deploys. |
| `custom_domain` | no | `""` | Custom hostname to attach (e.g., `atoms.convergent-systems.co`). |
| `zone_id` | no | `""` | Cloudflare zone ID hosting the custom domain. |

## Required token scopes

- **Account → Cloudflare Pages → Edit** (always)
- **Zone → DNS → Edit** on the relevant zone (only when `custom_domain` is set)

## State

State lives in the env composition's backend config — not here. See `infra/terraform/envs/<env>/backend.tf`.
