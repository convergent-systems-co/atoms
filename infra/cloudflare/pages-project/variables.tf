variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name. Default URL: https://<project_name>.pages.dev. Custom domain atoms.convergent-systems.com attached out-of-band."
  type        = string
  default     = "atoms-umbrella"
}

variable "production_branch" {
  description = "Branch that triggers production deployments."
  type        = string
  default     = "main"
}
