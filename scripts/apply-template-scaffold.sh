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

main() {
  if [[ $# -eq 0 ]]; then usage; exit 1; fi

  local template="" target="" catalog="" site="" dry_run=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --template) template="$2"; shift 2 ;;
      --target)   target="$2";   shift 2 ;;
      --catalog) catalog="$2";   shift 2 ;;
      --site)     site="$2";     shift 2 ;;
      --dry-run)  dry_run=1;     shift ;;
      --help)     usage; exit 0 ;;
      --version)  echo "$VERSION"; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
    esac
  done

  echo "[scaffold] template=$template target=$target catalog=$catalog site=$site dry_run=$dry_run"
}

main "$@"
