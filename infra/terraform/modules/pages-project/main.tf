# Direct-upload Pages project. Deployments arrive via `wrangler pages
# deploy` in .github/workflows/deploy.yml — no Git-source binding.
# This project hosts the umbrella catalog directory at
# atoms.convergent-systems.co (custom domain attached out-of-band).
resource "cloudflare_pages_project" "this" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch
}
