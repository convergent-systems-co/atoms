---
name: atom-status
description: Run a fleet snapshot of all 19 *-atoms.com catalog sites under convergent-systems-co — GitHub repo description, latest deploy on main, apex DNS, apex HTTPS reachability, *.pages.dev reachability, and open PR count. Use when the user asks about the state of the atoms catalog ecosystem, wants to verify deployments across the fleet, or asks for a "fleet snapshot" / "fleet status" / "atom status" report.
---

# /atom-status

Runs `scripts/atom-status.sh` and reports the **Fleet Snapshot** — one row per catalog site, deployment-and-health view of the *-atoms.com ecosystem.

## What it shows

Per atom catalog (19 total):

| Column | Source |
|---|---|
| Deploy | Latest run of `deploy.yml` on `main` — conclusion + 7-char SHA |
| Apex DNS | `dig @1.1.1.1 <atom>-atoms.com A` |
| Apex | HTTPS status code at `https://<atom>-atoms.com` |
| Pages | HTTPS status code at `https://<atom>-atoms.pages.dev` |
| PRs | Open pull request count (dependabot + feature) |

In `--verbose` mode it also prints the GitHub repo description and the `<title>` from each apex / pages.dev response.

## When to use

- "What's the state of the atoms fleet?"
- "Are all 19 deploying green?"
- "Status of the *-atoms.com sites"
- After cross-fleet changes (deploy workflow update, secret rotation, dependency sweep)
- Before declaring multi-catalog work "done"

## Invocation

From the umbrella `atoms` repo root:

```bash
scripts/atom-status.sh                # all 19, default columns
scripts/atom-status.sh --verbose      # adds descriptions + titles
scripts/atom-status.sh --atom brand   # just one catalog
```

## What it does NOT check

- Cloudflare Pages project state directly (HTTP probe stands in)
- Terraform state drift in `infra/terraform/`
- Submodule pointer freshness in the umbrella repo
- DNS-token allowlist or zone-level config
- CI workflows other than `deploy.yml`

If `Apex DNS` is `NONE`, the site is likely blocked on a separate operator action (e.g., DNS-token allowlist for an unrouted zone). The deploy may still be green and `pages.dev` reachable; the apex just isn't routed yet. Surface that distinction in your report — green deploy ≠ live apex.

## Dependencies

`gh`, `jq`, `dig`, `curl` — all standard on the operator workstation. The script `set -e`'s on missing tools.

## Output discipline

The script writes ASCII to stdout — terminal-renderable, no Mermaid. Per `~/.ai/Common.md §U16.1`, when relaying results back to the user in a TUI conversation, keep the ASCII table form; do not convert to a Markdown table or Mermaid diagram unless the destination is a `.md` artifact.
