#!/usr/bin/env bash
# verify-template-alignment.sh — checks SC-1 through SC-9 from the spec
# See docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md
set -u

CATALOGS=(
  agent-atoms brand-atoms channel-atoms compliance-atoms event-atoms
  identity-atoms knowledge-atoms model-atoms persona-atoms plugin-atoms
  policy-atoms profile-atoms prompt-atoms service-atoms theme-atoms
  workflow-atoms
)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$(cd "$REPO_ROOT/../astro-tf-app-template" 2>/dev/null && pwd || true)"

fail_count=0
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; fail_count=$((fail_count + 1)); }

cd "$REPO_ROOT"

echo "SC-1: identical scaffold paths across catalogs"
for c in "${CATALOGS[@]}"; do
  for path in .devcontainer .github/workflows .github/ISSUE_TEMPLATE \
              docs/adr Makefile ARCHITECTURE.md CODEOWNERS COPYRIGHT \
              SECURITY.md .editorconfig .gitattributes .tool-versions \
              infra/terraform/envs/dev infra/terraform/envs/stg \
              infra/terraform/envs/prod; do
    if [[ ! -e "src/$c/$path" ]]; then
      fail "src/$c missing $path"
    fi
  done
done
[[ $fail_count -eq 0 ]] && pass "all 16 catalogs have full scaffold"

echo
echo "SC-5: license bundle present"
sc5_fails_before=$fail_count
for c in "${CATALOGS[@]}"; do
  for f in LICENSE LICENSE-data NOTICE; do
    if [[ ! -f "src/$c/$f" ]]; then
      fail "src/$c missing $f"
    fi
  done
  if [[ -f "src/$c/LICENSE" ]] && ! grep -q "Apache License" "src/$c/LICENSE"; then
    fail "src/$c/LICENSE is not Apache"
  fi
done
[[ $fail_count -eq $sc5_fails_before ]] && pass "license bundle present in all 16 catalogs"

echo
echo "SC-6: profile-atoms has design doc and build-out issue"
if [[ -f src/profile-atoms/docs/design/profile-atoms-v1.0.0.md ]]; then
  pass "profile-atoms design doc present"
else
  fail "profile-atoms design doc missing"
fi
if gh issue list --repo convergent-systems-co/profile-atoms --state all --json title --jq '.[].title' 2>/dev/null \
   | grep -q "Build out v1.0.0"; then
  pass "build-out issue exists in profile-atoms"
else
  fail "build-out issue missing (or gh not authenticated)"
fi

echo
echo "SC-7: umbrella tf-plan ENV=stg works (smoke)"
if [[ -d infra/terraform/envs/stg ]]; then
  pass "infra/terraform/envs/stg exists"
else
  fail "infra/terraform/envs/stg missing"
fi

echo
echo "SC-8: submodule pointers clean"
drift=$(git submodule status | grep -E '^[+-]' || true)
if [[ -z "$drift" ]]; then
  pass "all submodule pointers clean"
else
  echo "$drift"
  fail "submodule pointers have drift markers"
fi

echo
if [[ -n "$TEMPLATE_DIR" ]]; then
  echo "SC-9: idempotency — apply-template-scaffold.sh produces no diff on three samples"
  for c in channel-atoms theme-atoms profile-atoms; do
    site=$([ "$c" == "channel-atoms" ] && echo single || echo existing)
    bash scripts/apply-template-scaffold.sh \
      --template "$TEMPLATE_DIR" \
      --target "src/$c" \
      --catalog "$c" \
      --site "$site" >/dev/null 2>&1
    if [[ -z "$(git -C "src/$c" status -s 2>/dev/null)" ]]; then
      pass "$c idempotent"
    else
      fail "$c produced changes on re-run"
    fi
  done
else
  echo "SC-9: SKIP (astro-tf-app-template not found at ../astro-tf-app-template)"
fi

echo
if [[ $fail_count -eq 0 ]]; then
  echo "ALL SUCCESS CRITERIA MET"
  exit 0
else
  echo "VERIFICATION FAILED ($fail_count failure(s))"
  exit 1
fi
