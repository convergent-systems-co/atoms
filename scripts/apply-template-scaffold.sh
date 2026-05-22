#!/usr/bin/env bash
# apply-template-scaffold.sh — idempotent template scaffolder for *-atoms repos
# See docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md
set -euo pipefail

VERSION="0.1.0"

usage() {
  cat <<EOF
Usage: apply-template-scaffold.sh [options]

Idempotent scaffolder. Copies astro-tf-app-template files into a target
*-atoms repo, applies single-site transforms, writes the dual-license bundle.

Options:
  --template <path>    Source template dir (required)
  --target <path>      Target repo dir (required)
  --catalog <name>     Catalog name, e.g. channel-atoms (required)
  --site <strategy>    existing | single  (required)
                         existing: leave web/ alone (Band A)
                         single:   scaffold web/ at root (Band B)
  --dry-run            Print actions without writing
  --help               Show this help
  --version            Show version

EOF
}

require_arg() {
  local name="$1" val="$2"
  if [[ -z "$val" ]]; then
    echo "Error: required: --$name" >&2
    usage >&2
    exit 2
  fi
}

main() {
  if [[ $# -eq 0 ]]; then usage; exit 1; fi

  local template="" target="" catalog="" site="" dry_run=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --template) template="$2"; shift 2 ;;
      --target)   target="$2";   shift 2 ;;
      --catalog)  catalog="$2";  shift 2 ;;
      --site)     site="$2";     shift 2 ;;
      --dry-run)  dry_run=1;     shift ;;
      --help)     usage; exit 0 ;;
      --version)  echo "$VERSION"; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
  done

  require_arg "template" "$template"
  require_arg "target"   "$target"
  require_arg "catalog"  "$catalog"
  require_arg "site"     "$site"

  if [[ "$site" != "existing" && "$site" != "single" ]]; then
    echo "Error: --site must be 'existing' or 'single' (got: $site)" >&2
    exit 2
  fi
  if [[ ! -d "$template" ]]; then
    echo "Error: template directory not found: $template" >&2
    exit 2
  fi
  if [[ ! -d "$target" ]]; then
    echo "Error: target directory not found: $target" >&2
    exit 2
  fi

  # shellcheck source=lib/scaffold-copy.sh
  source "$(dirname "$0")/lib/scaffold-copy.sh"

  copy_non_web_scaffold "$template" "$target" "$dry_run"

  # shellcheck source=lib/scaffold-substitute.sh
  source "$(dirname "$0")/lib/scaffold-substitute.sh"

  substitute_tokens "$target" "$catalog" "$dry_run"

  # shellcheck source=lib/scaffold-transform.sh
  source "$(dirname "$0")/lib/scaffold-transform.sh"

  transform_makefile_single_site "$target" "$dry_run"
  transform_workflows_single_site "$target" "$dry_run"

  # shellcheck source=lib/scaffold-license.sh
  source "$(dirname "$0")/lib/scaffold-license.sh"

  write_license_bundle "$target" "$catalog" "$dry_run"

  if [[ "$site" == "single" ]]; then
    copy_web_single_site "$template" "$target" "$dry_run"
  fi

  echo "[scaffold] template=$template target=$target catalog=$catalog site=$site dry_run=$dry_run"
  echo
  echo "[scaffold] complete: $target"
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[scaffold] (dry-run — no changes written)"
  fi
}

main "$@"
