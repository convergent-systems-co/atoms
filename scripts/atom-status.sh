#!/usr/bin/env bash
# Fleet status snapshot for the *-atoms catalog sites under convergent-systems-co.
#
# Reports per catalog: GitHub description, latest deploy on main, apex DNS,
# apex HTTPS reachability, *.pages.dev reachability, open PR count.
#
# Usage:
#   scripts/atom-status.sh                # all 19
#   scripts/atom-status.sh --atom brand   # one catalog
#   scripts/atom-status.sh --verbose      # include titles + descriptions
#
# Dependencies: gh, jq, dig, curl

set -euo pipefail

ATOMS=(agent brand channel compliance event identity knowledge model
       persona pipeline plugin policy profile prompt schema service
       skill theme workflow)

ORG="convergent-systems-co"

usage() {
  sed -n '2,11p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

verbose=0
selected=("${ATOMS[@]}")

while [ $# -gt 0 ]; do
  case "$1" in
    --atom)
      shift
      [ $# -gt 0 ] || { echo "error: --atom requires a value" >&2; exit 2; }
      selected=("$1")
      ;;
    --verbose|-v)
      verbose=1
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage 2
      ;;
  esac
  shift
done

for tool in gh jq dig curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "error: $tool not found in PATH" >&2; exit 3; }
done

map_data_license() {
  case "$1" in
    "Attribution 4.0 International"*)               echo "CC-BY-4.0" ;;
    "Attribution-ShareAlike 4.0 International"*)    echo "CC-BY-SA-4.0" ;;
    "Attribution-NoDerivatives 4.0 International"*) echo "CC-BY-ND-4.0" ;;
    "Attribution-NonCommercial 4.0 International"*) echo "CC-BY-NC-4.0" ;;
    "Creative Commons Legal Code"*)                 echo "CC0-1.0" ;;
    "MIT"*)                                          echo "MIT" ;;
    "Apache License"*|"Apache-2.0"*)                echo "Apache-2.0" ;;
    "")                                              echo "MISSING" ;;
    *)                                               echo "unknown" ;;
  esac
}

probe_one() {
  local atom="$1"
  local repo="${ORG}/${atom}-atoms"
  local apex="${atom}-atoms.com"

  local desc deploy_concl deploy_sha ip apex_http apex_title pages_http pages_title pr_count code_lic data_lic data_first

  desc=$(gh repo view "$repo" --json description --jq '.description // ""' 2>/dev/null || echo "")

  code_lic=$(gh api "repos/${repo}" --jq '.license.spdx_id // "MISSING"' 2>/dev/null || echo "?")
  [ -z "$code_lic" ] || [ "$code_lic" = "null" ] && code_lic="MISSING"

  data_first=$(gh api "repos/${repo}/contents/LICENSE-data" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null | head -1 | tr -d '\r' || true)
  data_lic=$(map_data_license "$data_first")

  read -r deploy_concl deploy_sha < <(
    gh run list --repo "$repo" --workflow=deploy.yml --branch=main --limit 1 \
      --json conclusion,headSha 2>/dev/null \
      | jq -r '.[0] | "\(.conclusion // "none") \(.headSha[0:7] // "?")"' \
      || echo "none ?"
  )

  ip=$(dig +short @1.1.1.1 "$apex" A 2>/dev/null | grep -E '^[0-9]+\.' | head -1 || true)

  if [ -n "$ip" ]; then
    apex_http=$(curl -o /dev/null -s -w '%{http_code}' --max-time 5 \
      --resolve "${apex}:443:${ip}" "https://${apex}" 2>/dev/null || echo "?")
    apex_title=$(curl -fsS --max-time 5 --resolve "${apex}:443:${ip}" "https://${apex}" 2>/dev/null \
      | grep -oE '<title>[^<]*</title>' | head -1 | sed -E 's/<\/?title>//g' || true)
    [ -z "$apex_title" ] && apex_title="-"
  else
    apex_http="-"
    apex_title="-"
  fi

  pages_http=$(curl -o /dev/null -s -w '%{http_code}' --max-time 5 \
    "https://${atom}-atoms.pages.dev" 2>/dev/null || echo "?")
  pages_title=$(curl -fsS --max-time 5 "https://${atom}-atoms.pages.dev" 2>/dev/null \
    | grep -oE '<title>[^<]*</title>' | head -1 | sed -E 's/<\/?title>//g' || true)
  [ -z "$pages_title" ] && pages_title="-"

  pr_count=$(gh pr list --repo "$repo" --state open --json number --jq 'length' 2>/dev/null || echo "?")

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$atom" "$deploy_concl" "$deploy_sha" "${ip:-NONE}" \
    "$apex_http" "$apex_title" "$pages_http" "$pages_title" "$pr_count" \
    "$code_lic" "$data_lic"
  printf '%s\n' "$desc" > "$tmpdir/${atom}.desc"
}

mark_deploy() {
  case "$1" in
    success) printf '\xe2\x9c\x93' ;;
    failure) printf '\xe2\x9c\x97' ;;
    *)       printf '?' ;;
  esac
}

mark_http() {
  case "$1" in
    2[0-9][0-9]) printf '\xe2\x9c\x93 %s' "$1" ;;
    -)           printf '\xe2\x80\x94' ;;
    *)           printf '\xe2\x9c\x97 %s' "$1" ;;
  esac
}

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

for atom in "${selected[@]}"; do
  probe_one "$atom" > "$tmpdir/${atom}.tsv" &
done
wait

printf '\n'
printf '%-18s  %-10s  %-7s  %-15s  %-7s  %-7s  %-3s  %-10s  %s\n' \
  "Atom" "Deploy" "SHA" "Apex DNS" "Apex" "Pages" "PRs" "Code" "Data"
printf -- '--------------------------------------------------------------------------------------------------------------------\n'

red=0
green=0
data_missing=0
code_missing=0
for atom in "${selected[@]}"; do
  IFS=$'\t' read -r name deploy_concl deploy_sha ip apex_http apex_title pages_http pages_title pr_count code_lic data_lic < "$tmpdir/${atom}.tsv"
  case "$deploy_concl" in success) green=$((green+1));; failure) red=$((red+1));; esac
  [ "$data_lic" = "MISSING" ] && data_missing=$((data_missing+1))
  [ "$code_lic" = "MISSING" ] && code_missing=$((code_missing+1))

  printf '%-18s  %-10s  %-7s  %-15s  %-9s  %-9s  %-3s  %-10s  %s\n' \
    "${name}-atoms" \
    "$(mark_deploy "$deploy_concl") ${deploy_concl}" \
    "$deploy_sha" \
    "$ip" \
    "$(mark_http "$apex_http")" \
    "$(mark_http "$pages_http")" \
    "$pr_count" \
    "$code_lic" \
    "$data_lic"
done

printf '\n'
printf 'Summary: %d/%d deploys green' "$green" "$((green+red))"
[ "$red" -gt 0 ] && printf ', %d red' "$red"
printf '.\n'
[ "$code_missing" -gt 0 ] && printf 'WARNING: %d repo(s) have no detectable code LICENSE.\n' "$code_missing"
[ "$data_missing" -gt 0 ] && printf 'WARNING: %d repo(s) have no LICENSE-data file.\n' "$data_missing"

if [ "$verbose" -eq 1 ]; then
  printf '\nDescriptions:\n'
  for atom in "${selected[@]}"; do
    desc=$(cat "$tmpdir/${atom}.desc" 2>/dev/null || echo "")
    if [ -z "$desc" ]; then desc='(empty)'; fi
    printf '  %s: %s\n' "${atom}-atoms" "$desc"
  done

  printf '\nApex titles:\n'
  for atom in "${selected[@]}"; do
    IFS=$'\t' read -r _ _ _ _ _ apex_title _ _ _ < "$tmpdir/${atom}.tsv"
    [ -z "$apex_title" ] && apex_title='-'
    printf '  %-18s %s\n' "${atom}-atoms" "$apex_title"
  done
fi
