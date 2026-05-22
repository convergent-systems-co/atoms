#!/usr/bin/env bash
# scaffold-transform.sh — single-site transforms

# Transform target's Makefile (copied from template's multi-site form)
# into single-site form: drop SITE variable, replace cd web/$(SITE) with cd web.
transform_makefile_single_site() {
  local target="$1" dry_run="$2"
  local f="$target/Makefile"

  [[ ! -f "$f" ]] && return 0
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] transform Makefile single-site: $f"
    return 0
  fi

  local tmp; tmp=$(mktemp)
  # Strip the SITE variable line; replace cd web/$(SITE) with cd web
  sed \
    -e '/^SITE[[:space:]]*?=/d' \
    -e 's|cd web/\$(SITE)|cd web|g' \
    "$f" > "$tmp"
  mv "$tmp" "$f"
}

# Replace 'web/site' references with 'web' in CI + release workflows.
transform_workflows_single_site() {
  local target="$1" dry_run="$2"
  local wf
  for wf in ci.yml release.yml; do
    local f="$target/.github/workflows/$wf"
    [[ ! -f "$f" ]] && continue
    if [[ "$dry_run" -eq 1 ]]; then
      echo "[dry] transform workflow: $f"
      continue
    fi
    local tmp; tmp=$(mktemp)
    sed -e 's|web/site|web|g' "$f" > "$tmp"
    mv "$tmp" "$f"
  done
}
