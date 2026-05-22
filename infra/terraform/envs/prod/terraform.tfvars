# Per-env variables for prod.
#
# Supply secrets via env vars, not committed values:
#   export TF_VAR_cloudflare_account_id=<account-id>
#   export TF_VAR_zone_id=<zone-id-for-convergent-systems.co>
#
# Look up the zone ID in the Cloudflare dashboard:
#   dash.cloudflare.com → convergent-systems.co → Overview → "Zone ID"
