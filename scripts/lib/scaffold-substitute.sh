#!/usr/bin/env bash
# scaffold-substitute.sh — token substitution in copied files

# Apply token substitution in-place on files under $target that were
# just copied from $template. Tokens:
#   {{PROJECT_NAME}}        → $catalog
#   https://example.com     → https://${catalog}.com
substitute_tokens() {
  local target="$1" catalog="$2" dry_run="$3"

  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] substitute_tokens: catalog=$catalog target=$target"
    return 0
  fi

  # Find files we expect to contain tokens (text files in scaffold paths).
  local expected_files=(
    "$target/ARCHITECTURE.md"
    "$target/CHANGELOG.md"
    "$target/CONTRIBUTING.md"
    "$target/SECURITY.md"
  )
  local f
  for f in "${expected_files[@]}"; do
    if [[ -f "$f" ]]; then
      _apply_subs "$f" "$catalog"
    fi
  done

  # Also process workflow files
  if [[ -d "$target/.github/workflows" ]]; then
    while IFS= read -r -d '' f; do
      _apply_subs "$f" "$catalog"
    done < <(find "$target/.github/workflows" -type f -name '*.yml' -print0)
  fi

  # Seed issues
  if [[ -d "$target/.github/seed-issues" ]]; then
    while IFS= read -r -d '' f; do
      _apply_subs "$f" "$catalog"
    done < <(find "$target/.github/seed-issues" -type f -name '*.md' -print0)
  fi
}

_apply_subs() {
  local file="$1" catalog="$2"
  # Escape sed replacement specials (& and \) in $catalog for safety.
  # Catalog names are kebab-case in practice, but the substitution must
  # remain correct if a name ever contains these characters.
  local catalog_escaped
  catalog_escaped=$(printf '%s' "$catalog" | sed -e 's/[&\]/\\&/g')
  # Use temp file for portability across BSD/GNU sed.
  # Use | as delimiter consistently to avoid issues with / in catalog names.
  local tmp; tmp=$(mktemp)
  sed -e "s|{{PROJECT_NAME}}|$catalog_escaped|g" \
      -e "s|https://example.com|https://$catalog_escaped.com|g" \
      "$file" > "$tmp"
  mv "$tmp" "$file"
}
