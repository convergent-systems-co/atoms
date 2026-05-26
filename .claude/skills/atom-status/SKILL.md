---
name: atom-status
description: >
  Full fleet snapshot of all *-atoms.com catalog sites — deploy health, DNS, HTTPS
  reachability, atom_types per catalog with item counts, schema compliance,
  /ai/index.json, Terraform backend, right-side sidenav, brand asset uniformity,
  builder script, federation field, and registry presence. Use when the user
  asks about the state of the atoms fleet, wants to verify deployments, asks for a
  "fleet snapshot" / "fleet status" / "atom status" / "atom-state" / schema compliance
  / license audit report, or before starting any cross-fleet work.
---

# /atom-status — Atoms Fleet Snapshot

Produces a single consolidated report for every `*-atoms.com` catalog site. The goal is **uniform state** — every catalog should have the same structure, same brand assets, same services available in the same way. This skill checks all uniformity criteria and surfaces gaps.

Run from the `atoms` repo root.

## The 25 catalogs

```
action-atoms      agent-atoms       amendment-atoms   brand-atoms
channel-atoms     compliance-atoms  constitution-atoms context-atoms
doc-atoms         event-atoms       identity-atoms    key-atoms
knowledge-atoms   model-atoms       persona-atoms     pipeline-atoms
plugin-atoms      policy-atoms      profile-atoms     prompt-atoms
schema-atoms      service-atoms     skill-atoms       theme-atoms
workflow-atoms
```

Local path: `src/<name>/`   Umbrella: this repo root   Domain: `<name>.com`

**Auth:** Use `polliard` account for GitHub API calls (has org-level access).

---

## Uniformity checklist — what every catalog MUST have

| # | Check | How to verify |
|---|---|---|
| 1 | **Registered in catalog** | `catalogs/<name>.toml` exists in umbrella repo |
| 2 | **Live site** | `curl https://<name>.com/` returns 200 |
| 3 | **Right-side sidenav** | Homepage HTML contains `class="sidenav"` |
| 4 | **Brand assets from CDN** | Favicon, wordmark, hero icon, CSS all load from `brand-atoms.com/dist/brands/atom-family/1.0.0/` |
| 5 | **Atom types listed on homepage** | Every `atom_types` entry from ATOMS.yml appears as a link on the homepage |
| 6 | **Item count per class shown** | Each type link shows `N atoms` count on the homepage |
| 7 | **AI discovery endpoint** | `https://<name>.com/ai/index.json` returns 200 + valid JSON |
| 8 | **Federation is convergent-systems.co** | `ATOMS.yml` has `federation: convergent-systems.co` (exactly, no trailing dot) |
| 9 | **Builder script** | `scripts/build-exports.py` exists in the repo |
| 10 | **Terraform backend wired** | `infra/terraform/envs/dev/backend.tf` contains `cs-tfstate` (not a stub) |
| 11 | **Schema version** | `ATOMS.yml` has `spec_version: atoms-spec/v1.1.0` |
| 12 | **Deploy after merge** | Deploy workflow fires on `push: branches: [main]` only |

---

## Data collection (run all in parallel)

### A. Filesystem checks (fast — no network)

```bash
BASE=/path/to/atoms/src
UMBRELLA=/path/to/atoms

for name in action-atoms agent-atoms ...; do
  DIR="$BASE/$name"
  
  # 1. Registry
  REG=$(test -f "$UMBRELLA/catalogs/$name.toml" && echo "✓" || echo "✗")
  
  # 8. Federation
  FED=$(python3 -c "import yaml; d=yaml.safe_load(open('$DIR/ATOMS.yml')); print(d.get('federation','missing'))" 2>/dev/null)
  FED_OK=$([ "$FED" = "convergent-systems.co" ] && echo "✓" || echo "✗ ($FED)")
  
  # 9. Builder
  BUILDER=$(test -f "$DIR/scripts/build-exports.py" && echo "✓" || echo "✗")
  
  # 10. Terraform
  TF_FILE="$DIR/infra/terraform/envs/dev/backend.tf"
  TF=$(grep -q "cs-tfstate" "$TF_FILE" 2>/dev/null && echo "✓" || echo "✗")
  
  # 11. Schema version
  SCHEMA=$(python3 -c "import yaml; d=yaml.safe_load(open('$DIR/ATOMS.yml')); print(d.get('spec_version', d.get('spec','missing')))" 2>/dev/null)
  
  # Atom types declared
  TYPES=$(python3 -c "import yaml; d=yaml.safe_load(open('$DIR/ATOMS.yml')); print(len(d.get('atom_types',[])))" 2>/dev/null)
  
  # Item counts from local catalog.json
  CAT_JSON=$([ -f "$DIR/exports/catalog.json" ] && echo "$DIR/exports/catalog.json" || echo "$DIR/web/public/exports/catalog.json")
  COUNTS=$(python3 -c "
import json, os
p='$CAT_JSON'
if os.path.exists(p):
    d=json.load(open(p))
    t={}
    for a in d.get('atoms',[]): t[a.get('type','?')]=t.get(a.get('type','?'),0)+1
    total=sum(t.values())
    detail=', '.join(f'{k}:{v}' for k,v in sorted(t.items()))
    print(f'{total}|{detail}')
else:
    print('0|no catalog.json')
" 2>/dev/null)
  
  echo "$name|$REG|$FED_OK|$BUILDER|$TF|$SCHEMA|$TYPES types|$COUNTS"
done
```

### B. Live HTTP checks (parallel curl, ~8s total)

```bash
for name in action-atoms agent-atoms ...; do
  DOMAIN="${name}.com"
  (
    # 2. Live site
    LIVE=$(curl -s -o /tmp/atom-${name}.html -w "%{http_code}" --max-time 8 "https://$DOMAIN/")
    
    # Read homepage HTML for multiple checks
    HTML=$(cat /tmp/atom-${name}.html 2>/dev/null)
    
    # 3. Right-side sidenav
    NAV=$(echo "$HTML" | grep -q 'class="sidenav"' && echo "✓" || echo "✗")
    
    # 4. Brand assets
    BRAND=$(echo "$HTML" | grep -q "brand-atoms.com/dist/brands/atom-family/1.0.0/" && echo "✓" || echo "✗")
    FAVICON=$(echo "$HTML" | grep -q "favicon.svg" && echo "✓" || echo "✗")
    LOGO=$(echo "$HTML" | grep -q "atom-family-wordmark" && echo "✓" || echo "✗")
    
    # 5+6. Types listed with counts
    LISTED_TYPES=$(echo "$HTML" | grep -oP '(?<=type=)[a-z][a-z0-9-]+' | sort -u | wc -l)
    HAS_COUNTS=$(echo "$HTML" | grep -qP '\d+ atoms?' && echo "✓" || echo "✗")
    
    # 7. AI discovery
    AI=$(curl -s -o /tmp/ai-${name}.json -w "%{http_code}" --max-time 6 "https://$DOMAIN/ai/index.json")
    AI_OK=$([ "$AI" = "200" ] && echo "✓" || echo "✗")
    
    # How-to and install pages (bonus)
    HOWTO=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/how-to-use")
    INSTALL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/install")
    
    rm -f /tmp/atom-${name}.html /tmp/ai-${name}.json
    echo "$name|$LIVE|$NAV|$BRAND/$FAVICON/$LOGO|$LISTED_TYPES|$HAS_COUNTS|$AI_OK|$HOWTO|$INSTALL"
  ) &
done
wait
```

### C. Deploy CI status (GitHub API)

```bash
for name in action-atoms agent-atoms ...; do
  SHA=$(git -C src/$name rev-parse HEAD 2>/dev/null)
  DEPLOY=$(gh api "repos/convergent-systems-co/$name/commits/$SHA/check-runs" \
    --jq '[.check_runs[] | select(.name == "deploy") | .conclusion] | .[0]' 2>/dev/null || echo "unknown")
  echo "$name: deploy=$DEPLOY"
done
```

---

## Output format

### Summary block

```
# Atoms Fleet Snapshot — {ISO-8601 UTC}
Federation target: convergent-systems.co | Org: convergent-systems-co
Brand CDN: brand-atoms.com/dist/brands/atom-family/1.0.0/

Uniformity score: N/25 catalogs fully uniform

  Live sites:          N/25
  AI discovery:        N/25
  Right-side nav:      N/25
  Brand assets OK:     N/25
  Atom types listed:   N/25  (with counts)
  Builder script:      N/25
  Terraform wired:     N/25
  Federation correct:  N/25
  Registry entry:      N/25
  Schema v1.1.0:       N/25
```

### Main fleet table

```
Catalog              | Live | /ai/ | Nav | Brand | Builder | TF  | Fed | Reg | Schema  | Deploy
---------------------|------|------|-----|-------|---------|-----|-----|-----|---------|-------
action-atoms         |  ✗   |  ✗   |  ✗  |  ✗    |   ✓     |  ✗  |  ✓  |  ✓  | v1.1.0  | ❌
agent-atoms          |  ✓   |  ✓   |  ✓  |  ✓    |   ✓     |  ✓  |  ✓  |  ✓  | v1.1.0  | ✅
...
```

Column key:
- **Live**: 200 from homepage
- **/ai/**: `/ai/index.json` returns 200
- **Nav**: `class="sidenav"` present (right-side menu)
- **Brand**: all assets from `brand-atoms.com/dist/brands/atom-family/1.0.0/`
- **Builder**: `scripts/build-exports.py` exists
- **TF**: Terraform backend has `cs-tfstate`
- **Fed**: `federation: convergent-systems.co` exactly
- **Reg**: `catalogs/<name>.toml` in umbrella repo
- **Schema**: spec_version field value
- **Deploy**: last CI deploy conclusion

### Atom types and item counts per catalog

```
Atom Types & Item Counts per Catalog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Catalog              | Types declared | Atoms (per class)
---------------------|----------------|------------------------------------------------
agent-atoms          | 5              | 48 total: tool-definition:20 persona:10 capability-declaration:8 role-boundary:5 isolation-constraint:5
brand-atoms          | 3              |  0 total: (no catalog.json atoms — composition-only)
compliance-atoms     | 4              | 17 total: control:9 control-family:5 evidence-type:3
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Gaps section

Group by pattern, sorted by count descending:

```
GAPS TO FIX (grouped by type)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[7] Sites not live — probably CF Pages project not created:
    action-atoms, amendment-atoms, constitution-atoms, context-atoms,
    doc-atoms, key-atoms, pipeline-atoms

[7] Missing /ai/index.json — add Astro page at src/pages/ai/index.json.ts:
    (same 7 as above)

[N] Missing right-side sidenav — <nav class="sidenav"> not in HTML:
    list repos...

[N] Brand assets not from CDN — check web/src/pages/index.astro for
    correct brand-atoms.com/dist/brands/atom-family/1.0.0/ URLs:
    list repos...

[2] Missing build-exports.py:
    policy-atoms, schema-atoms

[1] Terraform not wired — backend.tf still has REPLACE-ME stub:
    action-atoms
```

---

## How to fix gaps (reference)

**Site not live** → CF Pages project doesn't exist. Run:
```bash
npx wrangler@3 pages project create <name> --production-branch=main
```
Then trigger a redeploy by pushing a commit or re-running the deploy workflow.

**Missing /ai/index.json** → Add `web/src/pages/ai/index.json.ts` (Astro static endpoint):
```typescript
import type { APIRoute } from 'astro';
import catalog from '../../public/exports/catalog.json';
import atomsYml from '../../../ATOMS.yml'; // via Vite yaml import or inline

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({
    name: "<name>",
    description: "...",
    canonical_domain: "<name>.com",
    atom_types: [...],
    catalog_url: "https://<name>.com/exports/catalog.json",
    federation: "convergent-systems.co",
    total_atoms: catalog.atoms.length,
    total_compositions: catalog.compositions.length,
  }), { headers: { 'Content-Type': 'application/json' } });
};
```

**Missing sidenav** → The index.astro template is missing the sidenav block. All pages should use the shared shell layout from `atoms-catalog.css` which includes the `<nav class="sidenav">` markup.

**Wrong brand assets** → Update `web/src/pages/index.astro` to use:
```html
<link rel="icon" type="image/svg+xml" href="https://brand-atoms.com/dist/brands/atom-family/1.0.0/assets/favicon.svg" />
<link rel="stylesheet" href="https://brand-atoms.com/dist/brands/atom-family/1.0.0/css/tokens.css" />
<link rel="stylesheet" href="https://brand-atoms.com/dist/brands/atom-family/1.0.0/ui/atoms-catalog.css" />
<!-- Hero: -->
<img src="https://brand-atoms.com/dist/brands/atom-family/1.0.0/assets/atom-family-icon.png" />
<!-- Wordmark in sidenav: -->
<img src="https://brand-atoms.com/dist/brands/atom-family/1.0.0/assets/atom-family-wordmark.png" />
```

**Missing builder** → Copy from agent-atoms:
```bash
cp src/agent-atoms/scripts/build-exports.py src/<name>/scripts/build-exports.py
```
Then update `CATALOG_NAME` and `COMPOSITIONS_DIR` in the script (or use the universal version that reads ATOMS.yml automatically).

---

## Bonus checks (include if time permits)

- **How-to and Install pages** — `/how-to-use` and `/install` return 200
- **Open PRs** — count via `gh pr list --repo convergent-systems-co/<name> --state open`
- **License files** — `LICENSE` (Apache-2.0) and `LICENSE-data` (CC-BY-4.0) both present
- **Atom types on homepage match ATOMS.yml** — every declared type appears as a link

---

## Output discipline

ASCII to stdout only. No Mermaid in TUI (`Common.md §U16.1`).
Use emoji (✓ ✗ ⚠) but keep table borders ASCII.
