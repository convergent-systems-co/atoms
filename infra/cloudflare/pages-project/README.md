# infra/cloudflare/pages-project

Terraform module that creates the Cloudflare Pages project hosting `atoms.convergent-systems.com` — the umbrella catalog directory site.

## What this creates

A single `cloudflare_pages_project` named `atoms-umbrella` (the default project name; the custom domain `atoms.convergent-systems.com` is attached out-of-band in the Cloudflare dashboard). Deployments arrive via `wrangler pages deploy` from `.github/workflows/deploy.yml` — no Git-source binding.

## Prerequisites

- OpenTofu or Terraform `>= 1.6.0`.
- AWS-compatible credentials for the `cs-tfstate` R2 backend (from `~/.env/convergent-systems.co/.env` via `eval "$(cat …)"`).
- `CLOUDFLARE_API_TOKEN` exported with `Cloudflare Pages — Edit` scope.
- convergent-systems-co Cloudflare account ID (FIFO var `CLOUDFLARE_ACCOUNT_ID`).

## Apply

```bash
cd infra/cloudflare/pages-project
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)"
set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_ACCOUNT_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"

tofu init
tofu plan
tofu apply -auto-approve
```

After apply, the project is reachable at `https://atoms-umbrella.pages.dev`. Attach the custom domain `atoms.convergent-systems.com` in the Cloudflare dashboard (Pages → atoms-umbrella → Custom domains) — DNS lives in the `convergent-systems.com` zone managed by the same account, so Cloudflare auto-creates the CNAME.

## State

```
s3://cs-tfstate/state-bucket/convergent-systems-co/atoms/pages-project.tfstate
```

## Destroy

Don't destroy this — it serves the central ecosystem directory.
