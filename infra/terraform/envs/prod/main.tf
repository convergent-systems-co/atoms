# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Required token scopes: Account → Cloudflare Pages (Edit).
provider "cloudflare" {}

module "pages_project" {
  source = "../../modules/pages-project"

  cloudflare_account_id = var.cloudflare_account_id
  project_name          = "atoms-umbrella"
  production_branch     = "main"
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

output "project_name" {
  value = module.pages_project.project_name
}

output "subdomain" {
  value = module.pages_project.subdomain
}
