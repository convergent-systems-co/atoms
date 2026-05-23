# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Token scopes required for this module (mirrors the core-infra token
# decomposition at convergent-systems-co/core-infra/terraform/cloudflare/*):
#
#   - Account → Cloudflare Pages → Edit
#       (created by terraform/cloudflare/account-token in core-infra)
#   - Zone → DNS → Edit  on the convergent-systems.co zone
#       (created by terraform/cloudflare/dns-token in core-infra)
#
# The intended operator workflow is: apply core-infra's token modules
# once, capture the value into the org secret store, then export that
# value as CLOUDFLARE_API_TOKEN before running this module.
#
# Module sourced from convergent-systems-co/core-infra (private repo) —
# CI fetches it via CORE_INFRA_READ_TOKEN (org-level secret, fine-grained
# PAT with Contents:Read on core-infra only). See .github/workflows/tf-plan.yml
# for the git url.insteadOf mapping that uses the token.
provider "cloudflare" {}

module "pages_project" {
  source = "git::https://github.com/convergent-systems-co/core-infra.git//terraform/cloudflare/pages-project?ref=v0.1.0"

  cloudflare_account_id = var.cloudflare_account_id
  project_name          = "atoms-umbrella"
  production_branch     = "main"
  custom_domain         = "atoms.convergent-systems.co"
  zone_id               = var.zone_id
}

# The Pages project resource moved when infra was migrated to the
# multi-env layout in PR #13: from root-module `cloudflare_pages_project.this`
# to `module.pages_project.cloudflare_pages_project.this`. The state on R2
# still pins the old address, so without this block terraform would
# destroy-then-create the live project. Resource itself is unchanged.
moved {
  from = cloudflare_pages_project.this
  to   = module.pages_project.cloudflare_pages_project.this
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for convergent-systems.co. Look up via `dash.cloudflare.com → convergent-systems.co → Overview → Zone ID`."
  type        = string
}

output "project_name" {
  value = module.pages_project.project_name
}

output "subdomain" {
  value = module.pages_project.subdomain
}

output "custom_domain" {
  value = module.pages_project.custom_domain
}
