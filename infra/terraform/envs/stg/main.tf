# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Required token scopes: Account → Cloudflare Pages (Edit).
provider "cloudflare" {}

# Stg composition — scaffolded only. No active stg Cloudflare Pages project
# yet; uncomment the module block when stg is needed.

# module "pages_project" {
#   source = "../../modules/pages-project"
#
#   cloudflare_account_id = var.cloudflare_account_id
#   project_name          = "atoms-umbrella-dev"
#   production_branch     = "main"
# }

variable "cloudflare_account_id" {
  description = "Cloudflare account ID. Optional in stg until the module is enabled."
  type        = string
  default     = ""
}
