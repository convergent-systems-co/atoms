locals {
  has_custom_domain = var.custom_domain != "" && var.zone_id != ""
}

# Direct-upload Pages project. Deployments arrive via `wrangler pages
# deploy` in .github/workflows/deploy.yml — no Git-source binding.
resource "cloudflare_pages_project" "this" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch
}

# Custom hostname attachment: tells Cloudflare Pages to serve traffic
# for the custom domain in addition to the default <project>.pages.dev.
resource "cloudflare_pages_domain" "custom" {
  count = local.has_custom_domain ? 1 : 0

  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.this.name
  name         = var.custom_domain
}

# CNAME pointing the custom domain at the Pages default subdomain.
# Proxied through Cloudflare so the orange-cloud is on (TLS termination,
# caching, custom-domain certificate auto-provisioning).
resource "cloudflare_dns_record" "pages_cname" {
  count = local.has_custom_domain ? 1 : 0

  zone_id = var.zone_id
  name    = var.custom_domain
  type    = "CNAME"
  content = "${var.project_name}.pages.dev"
  proxied = true
  ttl     = 1 # 1 = "auto" — required when proxied

  comment = "Cloudflare Pages — managed by infra/terraform/modules/pages-project"

  depends_on = [cloudflare_pages_domain.custom]
}
