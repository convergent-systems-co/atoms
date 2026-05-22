output "project_name" {
  description = "Cloudflare Pages project name."
  value       = cloudflare_pages_project.this.name
}

output "subdomain" {
  description = "Default Pages subdomain (e.g., atoms-umbrella.pages.dev). Custom domain atoms.convergent-systems.com attached out-of-band."
  value       = cloudflare_pages_project.this.subdomain
}

output "created_on" {
  description = "Project creation timestamp."
  value       = cloudflare_pages_project.this.created_on
}
