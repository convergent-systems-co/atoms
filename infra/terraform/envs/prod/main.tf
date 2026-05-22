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
