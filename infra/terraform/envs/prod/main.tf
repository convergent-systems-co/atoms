# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Required token scopes:
#   - Account → Cloudflare Pages → Edit
#   - Zone → DNS → Edit (for the convergent-systems.co zone)
provider "cloudflare" {}

module "pages_project" {
  source = "../../modules/pages-project"

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
