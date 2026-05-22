# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Required token scopes: Account → Cloudflare Pages (Edit).
provider "cloudflare" {}

# Dev composition — scaffolded only. No active dev Cloudflare Pages project
# yet; uncomment the module block when dev is needed.

# module "pages_project" {
#   source = "../../modules/pages-project"
#
#   cloudflare_account_id = var.cloudflare_account_id
#   project_name          = "atoms-umbrella-dev"
#   production_branch     = "main"
# }

variable "cloudflare_account_id" {
  description = "Cloudflare account ID. Optional in dev until the module is enabled."
  type        = string
  default     = ""
}
