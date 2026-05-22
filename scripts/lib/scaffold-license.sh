#!/usr/bin/env bash
# scaffold-license.sh — write Apache-2.0 + CC-BY-4.0 + NOTICE bundle

write_license_bundle() {
  local target="$1" catalog="$2" dry_run="$3"
  local lib
  lib="$(dirname "${BASH_SOURCE[0]}")/license-texts"

  _write_license "$target/LICENSE"      "$lib/apache-2.0.txt" "Apache License"  "$dry_run"
  _write_license "$target/LICENSE-data" "$lib/cc-by-4.0.txt"  "Creative Commons" "$dry_run"
  _write_notice  "$target/NOTICE"       "$lib/NOTICE.template" "$catalog"        "$dry_run"
}

_write_license() {
  local dst="$1" src="$2" marker="$3" dry_run="$4"

  if [[ -f "$dst" ]] && grep -q "$marker" "$dst"; then
    echo "[skip] $dst (already $marker)"
    return 0
  fi
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] write license: $dst from $src"
    return 0
  fi
  cp "$src" "$dst"
  echo "[write] $dst"
}

_write_notice() {
  local dst="$1" template="$2" catalog="$3" dry_run="$4"

  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] write NOTICE: $dst (catalog=$catalog)"
    return 0
  fi
  # Escape sed replacement specials in $catalog (& and \) and use | delimiter
  # to avoid issues if catalog names ever contain /. See scaffold-substitute.sh.
  local catalog_escaped
  catalog_escaped=$(printf '%s' "$catalog" | sed -e 's/[&\]/\\&/g')
  sed -e "s|{{PROJECT_NAME}}|$catalog_escaped|g" "$template" > "$dst"
  echo "[write] $dst"
}
