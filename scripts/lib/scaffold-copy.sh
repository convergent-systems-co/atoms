#!/usr/bin/env bash
# scaffold-copy.sh — file copy helpers (no-overwrite default)

# Files and dirs the script copies from template to target.
# Excludes web/ (handled separately) and license files (handled separately).
SCAFFOLD_PATHS=(
  ".devcontainer"
  ".editorconfig"
  ".gitattributes"
  ".tool-versions"
  ".github/workflows"
  ".github/ISSUE_TEMPLATE"
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".github/dependabot.yml"
  ".github/FUNDING.yml"
  ".github/seed-issues"
  "docs/adr"
  "infra/terraform"
  "Makefile"
  "ARCHITECTURE.md"
  "CHANGELOG.md"
  "CODE_OF_CONDUCT.md"
  "CONTRIBUTING.md"
  "CODEOWNERS"
  "COPYRIGHT"
  "SECURITY.md"
)

# Files the script must NEVER overwrite even if it would otherwise copy them.
SCAFFOLD_NEVER_OVERWRITE=(
  "README.md"
  "GOALS.md"
  ".gitignore"
)

# Copy non-web scaffold from template to target.
# Idempotent: skips files that already exist at target unless --force.
copy_non_web_scaffold() {
  local template="$1" target="$2" dry_run="$3"
  local rel src dst

  for rel in "${SCAFFOLD_PATHS[@]}"; do
    src="$template/$rel"
    dst="$target/$rel"
    if [[ ! -e "$src" ]]; then continue; fi

    if [[ -d "$src" ]]; then
      _copy_dir_norewrite "$src" "$dst" "$dry_run"
    else
      _copy_file_norewrite "$src" "$dst" "$dry_run"
    fi
  done
}

_copy_file_norewrite() {
  local src="$1" dst="$2" dry_run="$3"
  if [[ -e "$dst" ]]; then
    echo "[skip] $dst (exists)"
    return 0
  fi
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] copy file: $src -> $dst"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "[copy] $dst"
}

_copy_dir_norewrite() {
  local src="$1" dst="$2" dry_run="$3"
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] copy dir: $src -> $dst"
    return 0
  fi
  mkdir -p "$dst"
  local entry rel
  while IFS= read -r -d '' entry; do
    rel="${entry#$src/}"
    if [[ -d "$entry" ]]; then
      mkdir -p "$dst/$rel"
    else
      if [[ -e "$dst/$rel" ]]; then
        echo "[skip] $dst/$rel (exists)"
      else
        mkdir -p "$(dirname "$dst/$rel")"
        cp "$entry" "$dst/$rel"
        echo "[copy] $dst/$rel"
      fi
    fi
  done < <(find "$src" -mindepth 1 -print0)
}
