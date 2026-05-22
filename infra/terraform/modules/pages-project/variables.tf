variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name. Default URL: https://<project_name>.pages.dev."
  type        = string
  default     = "atoms-umbrella"
}

variable "production_branch" {
  description = "Branch that triggers production deployments."
  type        = string
  default     = "main"
}

variable "custom_domain" {
  description = "Custom hostname to attach to the Pages project (e.g., atoms.convergent-systems.co). Leave empty to skip the domain attachment and DNS record."
  type        = string
  default     = ""
}

variable "zone_id" {
  description = "Cloudflare zone ID hosting the custom domain. Required when custom_domain is set."
  type        = string
  default     = ""
}
