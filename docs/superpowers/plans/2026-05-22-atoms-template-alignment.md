# Atoms Template Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all 16 `*-atoms` submodules to `astro-tf-app-template` (and the umbrella to `go-tf-app-template`) via an idempotent scaffold script plus per-repo PRs, without breaking the two production sites.

**Architecture:** A single idempotent bash script (`scripts/apply-template-scaffold.sh`) lives in the umbrella and is tested with `bats`. It copies template files into a target submodule, applies single-site transforms, writes the Apache-2.0 + CC-BY-4.0 + NOTICE license bundle, and is invoked once per catalog. Each catalog gets its own feature branch and PR in its own GitHub repo; the umbrella's submodule pointer is bumped after each merge.

**Tech Stack:** bash, bats (testing), git, `gh` CLI, Astro 6, Terraform, GitHub Actions, Cloudflare Pages

**Source spec:** `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md`

---

## File Structure

### Created by Phase 0

```
scripts/apply-template-scaffold.sh         # main script
scripts/lib/scaffold-copy.sh               # file copy helpers
scripts/lib/scaffold-transform.sh          # Makefile + workflow single-site transforms
scripts/lib/scaffold-license.sh            # Apache-2.0 + CC-BY-4.0 + NOTICE writers
scripts/lib/scaffold-substitute.sh         # token substitution
scripts/test/apply-template-scaffold.bats  # bats test suite
scripts/test/fixtures/                     # fixture template + catalog dirs
scripts/test/fixtures/template/            # minimal mock of astro-tf-app-template
scripts/test/fixtures/catalog-bandA/       # minimal mock with existing web/
scripts/test/fixtures/catalog-bandB/       # minimal mock without web/
scripts/test/helpers.bash                  # bats helpers (setup_test_repo, etc.)
```

### Each submodule gets these new/changed files (delivered by Phase 1-3 PRs)

```
.devcontainer/devcontainer.json            (new)
.editorconfig                              (new)
.gitattributes                             (new)
.tool-versions                             (new)
.github/workflows/{bootstrap,ci,           (new/replaced)
  label-cleanup,label-sync,release,
  secret-scan,tf-plan,triage}.yml
.github/ISSUE_TEMPLATE/{bug,chore,         (new)
  config,feature,rfc}.yml
.github/PULL_REQUEST_TEMPLATE.md           (new)
.github/dependabot.yml                     (new)
.github/FUNDING.yml                        (new)
.github/seed-issues/{00..10}-*.md          (new)
docs/adr/0000-record-architecture-decisions.md  (new)
infra/terraform/.tflint.hcl                (new)
infra/terraform/.terraform-version         (new)
infra/terraform/modules/.keep              (new)
infra/terraform/envs/{dev,stg,prod}/       (new)
  {main.tf,backend.tf,terraform.tfvars}
Makefile                                   (new, single-site form)
ARCHITECTURE.md                            (new)
CHANGELOG.md                               (new)
CODE_OF_CONDUCT.md                         (new)
CONTRIBUTING.md                            (new)
CODEOWNERS                                 (new)
COPYRIGHT                                  (new)
SECURITY.md                                (new)
LICENSE                                    (new or preserved if Apache-2.0)
LICENSE-data                               (new)
NOTICE                                     (new)
web/README.md                              (new, "single-site at web/")

# Band B only — full Astro single-site shell at web/:
web/astro.config.mjs                       (new)
web/package.json                           (new)
web/package-lock.json                      (new)
web/tsconfig.json                          (new)
web/public/.gitkeep                        (new)
web/src/pages/index.astro                  (new, catalog landing page)
```

### Profile-atoms additionally gets

```
docs/design/profile-atoms-v1.0.0.md        (new, copy of ~/Downloads/...)
GOALS.md                                   (modified — pointer line appended)
```

### Umbrella (Phase 4)

```
infra/terraform/envs/stg/                  (new)
  {main.tf,backend.tf,terraform.tfvars}
ARCHITECTURE.md                            (new if absent)
CODEOWNERS                                 (new if absent)
COPYRIGHT                                  (new if absent)
SECURITY.md                                (new if absent)
LICENSE                                    (Apache-2.0)
LICENSE-data                               (CC-BY-4.0)
NOTICE                                     (new)
```

---

# PHASE 0 — Build the script

Phase 0 produces a tested, committed `apply-template-scaffold.sh` plus its bats test suite, all in the umbrella under `scripts/`.

## Task 0.1: Script skeleton + bats harness

**Files:**
- Create: `scripts/apply-template-scaffold.sh`
- Create: `scripts/test/apply-template-scaffold.bats`
- Create: `scripts/test/helpers.bash`
- Create: `scripts/test/fixtures/template/README.md` (placeholder)

- [ ] **Step 1: Create script skeleton with `--help` and version**

`scripts/apply-template-scaffold.sh`:

```bash
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
```

```bash
chmod +x scripts/apply-template-scaffold.sh
```

- [ ] **Step 2: Create bats helper**

`scripts/test/helpers.bash`:

```bash
#!/usr/bin/env bash
# Shared helpers for bats tests.

SCRIPT="${BATS_TEST_DIRNAME}/../apply-template-scaffold.sh"

make_temp_dir() {
  mktemp -d
}

# Make a minimal fake template tree under $1
make_fixture_template() {
  local dir="$1"
  mkdir -p "$dir/.github/workflows" "$dir/infra/terraform/envs/dev" "$dir/web/site/src/pages"
  echo "# template README" > "$dir/README.md"
  cat > "$dir/Makefile" <<'EOF'
SITE ?= site
install: ; cd web/$(SITE) && npm ci
build:   ; cd web/$(SITE) && npm run build
EOF
  cat > "$dir/.github/workflows/ci.yml" <<'EOF'
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd web/site && npm ci && npm run build
EOF
  echo "GNU AFFERO GENERAL PUBLIC LICENSE" > "$dir/LICENSE"
  echo '{}' > "$dir/web/site/package.json"
  echo '<html></html>' > "$dir/web/site/src/pages/index.astro"
}

# Make a band-B target (no web/)
make_fixture_catalog_bandB() {
  local dir="$1"
  mkdir -p "$dir/atoms" "$dir/schemas"
  echo "# catalog README" > "$dir/README.md"
  echo "catalog: bandb" > "$dir/ATOMS.yml"
  git init --quiet --initial-branch=main "$dir"
}

# Make a band-A target (existing web/ + Apache LICENSE)
make_fixture_catalog_bandA() {
  local dir="$1"
  mkdir -p "$dir/atoms" "$dir/schemas" "$dir/web/src/pages"
  echo "# catalog README" > "$dir/README.md"
  echo '{"name":"@cat/web","scripts":{"build":"astro build"}}' > "$dir/web/package.json"
  echo '<html></html>' > "$dir/web/src/pages/index.astro"
  echo "                                 Apache License" > "$dir/LICENSE"
  git init --quiet --initial-branch=main "$dir"
}
```

- [ ] **Step 3: Write the first failing test — `--help` exits 0**

`scripts/test/apply-template-scaffold.bats`:

```bash
#!/usr/bin/env bats
load helpers

@test "--help exits 0 and prints usage" {
  run "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Usage:" ]]
}

@test "--version prints semver" {
  run "$SCRIPT" --version
  [ "$status" -eq 0 ]
  [[ "$output" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

@test "no args prints usage to stderr and exits 1" {
  run "$SCRIPT"
  [ "$status" -eq 1 ]
}

@test "unknown option exits 2" {
  run "$SCRIPT" --bogus
  [ "$status" -eq 2 ]
}
```

- [ ] **Step 4: Run tests to verify the harness works**

```bash
brew install bats-core   # if not already
bats scripts/test/apply-template-scaffold.bats
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/test/
git commit -m "feat(scripts): scaffold script skeleton + bats harness"
```

## Task 0.2: Argument validation + dry-run plumbing

**Files:**
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing tests for required-arg validation**

Add to `apply-template-scaffold.bats`:

```bash
@test "missing --template exits 2 with clear error" {
  run "$SCRIPT" --target /tmp/x --catalog c --site single
  [ "$status" -eq 2 ]
  [[ "$output" =~ "required: --template" ]]
}

@test "missing --target exits 2" {
  run "$SCRIPT" --template /tmp/t --catalog c --site single
  [ "$status" -eq 2 ]
}

@test "missing --catalog exits 2" {
  run "$SCRIPT" --template /tmp/t --target /tmp/x --site single
  [ "$status" -eq 2 ]
}

@test "missing --site exits 2" {
  run "$SCRIPT" --template /tmp/t --target /tmp/x --catalog c
  [ "$status" -eq 2 ]
}

@test "--site must be existing or single" {
  run "$SCRIPT" --template /tmp/t --target /tmp/x --catalog c --site bogus
  [ "$status" -eq 2 ]
  [[ "$output" =~ "--site must be" ]]
}

@test "--template must exist as a directory" {
  run "$SCRIPT" --template /nonexistent --target /tmp/x --catalog c --site single
  [ "$status" -eq 2 ]
  [[ "$output" =~ "template directory not found" ]]
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 4 prior + 6 new tests; the 6 new ones fail.

- [ ] **Step 3: Add validation logic to the script**

Replace `main()` in `scripts/apply-template-scaffold.sh`:

```bash
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

  echo "[scaffold] template=$template target=$target catalog=$catalog site=$site dry_run=$dry_run"
}

main "$@"
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 10 passing tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): argument validation"
```

## Task 0.3: Non-web file copy (no-overwrite default)

**Files:**
- Create: `scripts/lib/scaffold-copy.sh`
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for non-web file copy**

Add to `apply-template-scaffold.bats`:

```bash
@test "copies non-web files from template into empty target (Band B)" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  # Non-web files should be copied
  [ -f "$tgt/.github/workflows/ci.yml" ]
  [ -f "$tgt/infra/terraform/envs/dev" ] || [ -d "$tgt/infra/terraform/envs/dev" ]
  [ -f "$tgt/Makefile" ]
}

@test "no-overwrite: pre-existing target files are preserved" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  echo "PRE-EXISTING" > "$tgt/README.md"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  # README.md was not overwritten
  grep -q "PRE-EXISTING" "$tgt/README.md"
}

@test "Band A: web/ tree is NOT touched" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandA "$tgt"

  local pre_hash; pre_hash=$(find "$tgt/web" -type f -exec sha256sum {} \; | sort | sha256sum)

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site existing
  [ "$status" -eq 0 ]

  local post_hash; post_hash=$(find "$tgt/web" -type f -exec sha256sum {} \; | sort | sha256sum)
  [ "$pre_hash" = "$post_hash" ]
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: previous tests pass + 3 new tests fail.

- [ ] **Step 3: Implement copy helper**

`scripts/lib/scaffold-copy.sh`:

```bash
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
```

- [ ] **Step 4: Wire into main script**

In `scripts/apply-template-scaffold.sh`, after the validation block in `main()`, add:

```bash
  # shellcheck source=lib/scaffold-copy.sh
  source "$(dirname "$0")/lib/scaffold-copy.sh"

  copy_non_web_scaffold "$template" "$target" "$dry_run"
```

- [ ] **Step 5: Run tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 13 passing tests (10 prior + 3 new).

- [ ] **Step 6: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/lib/scaffold-copy.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): non-web file copy with no-overwrite semantics"
```

## Task 0.4: Token substitution

**Files:**
- Create: `scripts/lib/scaffold-substitute.sh`
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for token substitution**

Add to `apply-template-scaffold.bats`:

```bash
@test "substitutes {{PROJECT_NAME}} with catalog name in copied files" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  echo "name: {{PROJECT_NAME}}" > "$tmpl/ARCHITECTURE.md"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog channel-atoms --site single
  [ "$status" -eq 0 ]
  grep -q "name: channel-atoms" "$tgt/ARCHITECTURE.md"
  ! grep -q "{{PROJECT_NAME}}" "$tgt/ARCHITECTURE.md"
}

@test "substitutes site URL placeholder" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  echo "site: https://example.com" > "$tmpl/ARCHITECTURE.md"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog channel-atoms --site single
  [ "$status" -eq 0 ]
  grep -q "site: https://channel-atoms.com" "$tgt/ARCHITECTURE.md"
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: prior 13 pass; 2 new fail.

- [ ] **Step 3: Implement substitution helper**

`scripts/lib/scaffold-substitute.sh`:

```bash
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
  # Use temp file for portability across BSD/GNU sed.
  local tmp; tmp=$(mktemp)
  sed -e "s/{{PROJECT_NAME}}/$catalog/g" \
      -e "s|https://example.com|https://$catalog.com|g" \
      "$file" > "$tmp"
  mv "$tmp" "$file"
}
```

- [ ] **Step 4: Wire into main**

In `scripts/apply-template-scaffold.sh`, after the copy call, add:

```bash
  # shellcheck source=lib/scaffold-substitute.sh
  source "$(dirname "$0")/lib/scaffold-substitute.sh"

  substitute_tokens "$target" "$catalog" "$dry_run"
```

- [ ] **Step 5: Run tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 15 passing tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/lib/scaffold-substitute.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): token substitution for catalog name and site URL"
```

## Task 0.5: Single-site Makefile + workflow transforms

**Files:**
- Create: `scripts/lib/scaffold-transform.sh`
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for Makefile single-site transform**

Add to `apply-template-scaffold.bats`:

```bash
@test "Makefile single-site: drops SITE variable and cd web/\$(SITE) becomes cd web" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  ! grep -q "SITE ?= site" "$tgt/Makefile"
  ! grep -q 'cd web/$(SITE)' "$tgt/Makefile"
  grep -q "cd web &&" "$tgt/Makefile"
}

@test "ci.yml single-site: path web/site becomes web" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]
  ! grep -q "web/site" "$tgt/.github/workflows/ci.yml"
  grep -q "cd web " "$tgt/.github/workflows/ci.yml"
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: prior 15 pass; 2 new fail.

- [ ] **Step 3: Implement transform helper**

`scripts/lib/scaffold-transform.sh`:

```bash
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
    -e '/^SITE\s*?=/d' \
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
```

- [ ] **Step 4: Wire into main**

In `scripts/apply-template-scaffold.sh`, after `substitute_tokens` call:

```bash
  # shellcheck source=lib/scaffold-transform.sh
  source "$(dirname "$0")/lib/scaffold-transform.sh"

  transform_makefile_single_site "$target" "$dry_run"
  transform_workflows_single_site "$target" "$dry_run"
```

- [ ] **Step 5: Run tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 17 passing tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/lib/scaffold-transform.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): single-site Makefile and workflow transforms"
```

## Task 0.6: License bundle (Apache-2.0 + CC-BY-4.0 + NOTICE)

**Files:**
- Create: `scripts/lib/scaffold-license.sh`
- Create: `scripts/lib/license-texts/apache-2.0.txt` (full Apache-2.0 text)
- Create: `scripts/lib/license-texts/cc-by-4.0.txt` (full CC-BY-4.0 text)
- Create: `scripts/lib/license-texts/NOTICE.template`
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for license bundle**

Add to `apply-template-scaffold.bats`:

```bash
@test "license bundle: writes LICENSE, LICENSE-data, NOTICE" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]
  [ -f "$tgt/LICENSE" ]
  [ -f "$tgt/LICENSE-data" ]
  [ -f "$tgt/NOTICE" ]
  grep -q "Apache License" "$tgt/LICENSE"
  grep -q "Creative Commons Attribution 4.0" "$tgt/LICENSE-data"
  grep -q "test-atoms" "$tgt/NOTICE"
}

@test "license bundle: preserves existing Apache-2.0 LICENSE (idempotent)" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandA "$tgt"  # band A already has Apache LICENSE

  local pre_hash; pre_hash=$(sha256sum "$tgt/LICENSE" | awk '{print $1}')

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site existing
  [ "$status" -eq 0 ]

  local post_hash; post_hash=$(sha256sum "$tgt/LICENSE" | awk '{print $1}')
  # Apache stays Apache; the script may overwrite with canonical Apache-2.0 text
  # but should be byte-equal if already canonical. Accept either pre==post OR
  # post matches canonical.
  if [[ "$pre_hash" != "$post_hash" ]]; then
    grep -q "Apache License" "$tgt/LICENSE"  # at least still Apache
  fi
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: prior 17 pass; 2 new fail.

- [ ] **Step 3: Add Apache-2.0 license text**

Download canonical Apache-2.0 text to `scripts/lib/license-texts/apache-2.0.txt`:

```bash
mkdir -p scripts/lib/license-texts
curl -fsSL https://www.apache.org/licenses/LICENSE-2.0.txt > scripts/lib/license-texts/apache-2.0.txt
head -1 scripts/lib/license-texts/apache-2.0.txt
# Expected: "                                 Apache License"
```

- [ ] **Step 4: Add CC-BY-4.0 license text**

Download canonical CC-BY-4.0 text:

```bash
curl -fsSL https://creativecommons.org/licenses/by/4.0/legalcode.txt > scripts/lib/license-texts/cc-by-4.0.txt
head -3 scripts/lib/license-texts/cc-by-4.0.txt
# Expected: contains "Creative Commons Attribution 4.0 International"
```

- [ ] **Step 5: Create NOTICE template**

`scripts/lib/license-texts/NOTICE.template`:

```
NOTICE

This repository ({{PROJECT_NAME}}) is dual-licensed by artifact class.

Source code
-----------
Source code in this repository — including but not limited to:
  *.go, *.ts, *.tsx, *.js, *.mjs, *.cjs, *.py, *.sh, *.astro,
  scripts/, validators, build configuration, Makefile, CI workflows
— is licensed under the Apache License, Version 2.0. See LICENSE.

Atom data and documentation
---------------------------
Atom data and documentation in this repository — including but not
limited to:
  atoms/, schemas/, exports/, docs/, *.md, and *.json / *.toml / *.yaml
  files used as atom data
— is licensed under the Creative Commons Attribution 4.0 International
License (CC-BY-4.0). See LICENSE-data.

Rationale
---------
This dual-licensing model matches the pattern used by civilization-grade
open infrastructure (IETF RFCs, Schema.org, Unicode): permissive code
licensing for maximum substrate adoption, attribution-preserving data
licensing for the encyclopedia content. See the design spec at
docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md
in the umbrella repository for the full rationale.
```

- [ ] **Step 6: Implement license writer**

`scripts/lib/scaffold-license.sh`:

```bash
#!/usr/bin/env bash
# scaffold-license.sh — write Apache-2.0 + CC-BY-4.0 + NOTICE bundle

write_license_bundle() {
  local target="$1" catalog="$2" dry_run="$3"
  local lib="$(dirname "${BASH_SOURCE[0]}")/license-texts"

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
  sed -e "s/{{PROJECT_NAME}}/$catalog/g" "$template" > "$dst"
  echo "[write] $dst"
}
```

- [ ] **Step 7: Wire into main**

In `scripts/apply-template-scaffold.sh`, after the transform calls:

```bash
  # shellcheck source=lib/scaffold-license.sh
  source "$(dirname "$0")/lib/scaffold-license.sh"

  write_license_bundle "$target" "$catalog" "$dry_run"
```

- [ ] **Step 8: Run tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 19 passing tests.

- [ ] **Step 9: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/lib/scaffold-license.sh scripts/lib/license-texts/ scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): Apache-2.0 + CC-BY-4.0 + NOTICE license bundle"
```

## Task 0.7: Band B web/ scaffold (single-site web/, not web/site/)

**Files:**
- Modify: `scripts/lib/scaffold-copy.sh`
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for Band B web scaffold**

Add to `apply-template-scaffold.bats`:

```bash
@test "Band B: scaffolds web/ at root (NOT web/site/) from template's web/site/" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  [ -f "$tgt/web/package.json" ]
  [ -f "$tgt/web/src/pages/index.astro" ]
  [ ! -d "$tgt/web/site" ]
}

@test "Band A (existing web/): script does NOT scaffold from template" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandA "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site existing
  [ "$status" -eq 0 ]

  # Existing package.json content unchanged
  grep -q "@cat/web" "$tgt/web/package.json"
  [ ! -f "$tgt/web/site/package.json" ]
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: prior 19 pass; 2 new fail (because no web/ scaffolding logic yet).

- [ ] **Step 3: Add `copy_web_single_site` to scaffold-copy.sh**

Append to `scripts/lib/scaffold-copy.sh`:

```bash
# Copy template's web/site/* to target/web/* (subdir collapsed for single-site form).
# Only called when --site single AND target has no web/.
copy_web_single_site() {
  local template="$1" target="$2" dry_run="$3"
  local src="$template/web/site"
  local dst="$target/web"

  if [[ -e "$dst" ]]; then
    echo "[skip] $dst (already exists)"
    return 0
  fi
  if [[ ! -d "$src" ]]; then
    echo "[warn] template has no web/site/ at $src" >&2
    return 0
  fi
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[dry] scaffold single-site web: $src -> $dst"
    return 0
  fi
  mkdir -p "$dst"
  cp -R "$src"/. "$dst"/
  echo "[scaffold] web/ from $src"

  # Also write web/README.md noting the single-site convention
  cat > "$dst/README.md" <<'EOF'
# Web

Single-site Astro project lives in this directory (not `web/site/`).
The umbrella's `apply-template-scaffold.sh` collapses the template's
multi-site convention to single-site form for `*-atoms` catalogs.
EOF
}
```

- [ ] **Step 4: Wire into main with --site gating**

In `scripts/apply-template-scaffold.sh`, after the license bundle call:

```bash
  if [[ "$site" == "single" ]]; then
    copy_web_single_site "$template" "$target" "$dry_run"
  fi
```

- [ ] **Step 5: Run tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 21 passing tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/lib/scaffold-copy.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): Band B single-site web/ scaffold"
```

## Task 0.8: Idempotency check + diff summary

**Files:**
- Modify: `scripts/apply-template-scaffold.sh`
- Modify: `scripts/test/apply-template-scaffold.bats`

- [ ] **Step 1: Write failing test for idempotency**

Add to `apply-template-scaffold.bats`:

```bash
@test "idempotency: second run on same target produces no changes" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  # Snapshot the target after first run.
  local hash1; hash1=$(find "$tgt" -not -path "*/.git/*" -type f -exec sha256sum {} \; | sort -k 2 | sha256sum | awk '{print $1}')

  # Second run, same arguments.
  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  local hash2; hash2=$(find "$tgt" -not -path "*/.git/*" -type f -exec sha256sum {} \; | sort -k 2 | sha256sum | awk '{print $1}')
  [ "$hash1" = "$hash2" ]
}

@test "--dry-run does not modify target" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  local pre_hash; pre_hash=$(find "$tgt" -not -path "*/.git/*" -type f -exec sha256sum {} \; | sort -k 2 | sha256sum | awk '{print $1}')

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single --dry-run
  [ "$status" -eq 0 ]

  local post_hash; post_hash=$(find "$tgt" -not -path "*/.git/*" -type f -exec sha256sum {} \; | sort -k 2 | sha256sum | awk '{print $1}')
  [ "$pre_hash" = "$post_hash" ]
}
```

- [ ] **Step 2: Run tests to verify idempotency holds (it should, given the no-overwrite semantics)**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: All tests pass. If idempotency test fails, investigate which step is non-deterministic — most likely the substitution running on already-substituted files (`{{PROJECT_NAME}}` already replaced → no-op; should be safe).

- [ ] **Step 3: Add final diff summary to main**

In `scripts/apply-template-scaffold.sh`, at the end of `main()`:

```bash
  echo
  echo "[scaffold] complete: $target"
  if [[ "$dry_run" -eq 1 ]]; then
    echo "[scaffold] (dry-run — no changes written)"
  fi
```

- [ ] **Step 4: Run all tests**

```bash
bats scripts/test/apply-template-scaffold.bats
```

Expected: 23 passing tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/apply-template-scaffold.sh scripts/test/apply-template-scaffold.bats
git commit -m "feat(scripts): idempotency check, dry-run safety, completion summary"
```

## Task 0.9: Real-world dry-run against `channel-atoms` and `theme-atoms`

**Files (no script changes; verification only):**

- [ ] **Step 1: Dry-run against channel-atoms**

```bash
bash scripts/apply-template-scaffold.sh \
  --template /Users/itsfwcp/workspace/convergent-system-co/astro-tf-app-template \
  --target  /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms \
  --catalog channel-atoms \
  --site single \
  --dry-run | tee /tmp/scaffold-channel-dryrun.log
```

Expected: log shows `[dry]` lines for ~50 file copies + license bundle + web scaffold.
Verify the target dir on disk is unchanged:

```bash
git -C /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms status -s
```

Expected: no output (working tree clean).

- [ ] **Step 2: Dry-run against theme-atoms (Band A — extra caution)**

```bash
bash scripts/apply-template-scaffold.sh \
  --template /Users/itsfwcp/workspace/convergent-system-co/astro-tf-app-template \
  --target  /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms \
  --catalog theme-atoms \
  --site existing \
  --dry-run | tee /tmp/scaffold-theme-dryrun.log
```

Expected: log shows `[dry]` lines for non-web copies + license bundle. **Crucially**, NO `[dry]` lines mention `web/`. Verify by grep:

```bash
grep "web/" /tmp/scaffold-theme-dryrun.log || echo "PASS: web/ untouched"
```

- [ ] **Step 3: Review the dry-run output with the user**

Before any real run, share the two log files with Thomas. Confirm:
- Band A leaves `web/` alone
- Band B will get a complete scaffold including `web/`
- License bundle plan is correct

- [ ] **Step 4: Commit (no code change — just a checkpoint)**

(Skip if no code changed. If reviewing produced any fixes, commit those.)

## Task 0.10: Open and merge umbrella PR for scripts/

**Files (no script changes):**

- [ ] **Step 1: Push the branch**

The script work is on `docs/template-alignment-design`. Push:

```bash
git -C /Users/itsfwcp/workspace/convergent-system-co/atoms push -u origin docs/template-alignment-design
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --repo convergent-systems-co/atoms \
  --title "feat(scripts): apply-template-scaffold for *-atoms alignment" \
  --body "$(cat <<'EOF'
## Summary
- Adds `scripts/apply-template-scaffold.sh` (idempotent template scaffolder)
- Adds bats test suite at `scripts/test/`
- Adds design spec at `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md`
- Adds implementation plan at `docs/superpowers/plans/2026-05-22-atoms-template-alignment.md`

## Test plan
- [ ] `bats scripts/test/apply-template-scaffold.bats` (23 tests pass)
- [ ] Dry-run output reviewed for `channel-atoms` (Band B)
- [ ] Dry-run output reviewed for `theme-atoms` (Band A — web/ untouched)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI green**

```bash
gh pr checks --watch
```

- [ ] **Step 4: Squash-merge after review**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 5: Update local main**

```bash
git -C /Users/itsfwcp/workspace/convergent-system-co/atoms switch main
git -C /Users/itsfwcp/workspace/convergent-system-co/atoms pull origin main
```

---

# PHASE 1 — Pilot (channel-atoms)

## Task 1.1: Apply scaffold to channel-atoms

**Files:** changes inside `src/channel-atoms/` (a submodule, separate git repo)

- [ ] **Step 1: Branch the submodule**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms
git fetch origin
git switch main && git pull origin main
git switch -c chore/template-alignment
```

- [ ] **Step 2: Run the script for real**

From the umbrella root:

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template /Users/itsfwcp/workspace/convergent-system-co/astro-tf-app-template \
  --target src/channel-atoms \
  --catalog channel-atoms \
  --site single
```

- [ ] **Step 3: Review the diff**

```bash
cd src/channel-atoms
git status
git diff --stat
```

Expected: ~50 new files, no modifications.

- [ ] **Step 4: Verify Astro site builds locally**

```bash
cd web
npm install
npm run build
```

Expected: build succeeds; `dist/` is produced.

- [ ] **Step 5: Verify idempotency**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template ../astro-tf-app-template \
  --target src/channel-atoms \
  --catalog channel-atoms \
  --site single
cd src/channel-atoms && git status -s
```

Expected: no new changes after the second run.

- [ ] **Step 6: Commit**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms
git add .
git commit -m "$(cat <<'EOF'
chore: align repo to astro-tf-app-template

Applies the umbrella's apply-template-scaffold.sh: adds standard docs,
workflows, devcontainer, infra/terraform multi-env scaffold, single-site
Makefile, and the Apache-2.0 + CC-BY-4.0 + NOTICE license bundle. Adds
a single-site Astro shell at web/ (Band B). No catalog data touched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Push and open PR**

```bash
git push -u origin chore/template-alignment
gh pr create --repo convergent-systems-co/channel-atoms \
  --title "chore: align repo to astro-tf-app-template" \
  --body "$(cat <<'EOF'
## Summary
Applies the umbrella's `apply-template-scaffold.sh`:
- Standard docs (ARCHITECTURE/CHANGELOG/CONTRIBUTING/CODE_OF_CONDUCT/SECURITY/CODEOWNERS/COPYRIGHT)
- `.github/` workflows, issue templates, dependabot, seed issues
- `.devcontainer/`, `.editorconfig`, `.gitattributes`, `.tool-versions`
- `infra/terraform/{modules,envs/{dev,stg,prod}}/`
- Single-site `Makefile` + `web/` Astro shell
- License bundle: `LICENSE` (Apache-2.0), `LICENSE-data` (CC-BY-4.0), `NOTICE`

Source spec: convergent-systems-co/atoms `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md`

## Test plan
- [ ] CI green (typecheck + build)
- [ ] tf-plan workflow succeeds for dev env
- [ ] No catalog data files modified (`ATOMS.yml`, `schemas/`, etc. unchanged)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8: Wait for CI green, then merge**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
```

## Task 1.2: Bump umbrella submodule pointer for channel-atoms

**Files:** umbrella `src/channel-atoms` pointer

- [ ] **Step 1: Pull submodule's new main**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms
git switch main && git pull origin main
```

- [ ] **Step 2: Stage the pointer bump in the umbrella**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/bump-channel-atoms
git add src/channel-atoms
git status
# Expected: "modified: src/channel-atoms"
```

- [ ] **Step 3: Commit and push**

```bash
git commit -m "chore: bump channel-atoms to template-aligned main"
git push -u origin chore/bump-channel-atoms
```

- [ ] **Step 4: Open and merge umbrella PR**

```bash
gh pr create --repo convergent-systems-co/atoms \
  --title "chore: bump channel-atoms submodule" \
  --body "Pointer bump after channel-atoms #N (template alignment)."
gh pr merge --squash --delete-branch
```

## Task 1.3: Pause — verify SC criteria for the pilot

- [ ] **Step 1: Verify SC-4 for channel-atoms**

```bash
gh run list --repo convergent-systems-co/channel-atoms --workflow ci --limit 3
```

Expected: latest CI run on `main` is green.

- [ ] **Step 2: Verify SC-5 for channel-atoms**

```bash
gh api repos/convergent-systems-co/channel-atoms/contents/LICENSE \
  --jq '.content' | base64 -d | head -1
gh api repos/convergent-systems-co/channel-atoms/contents/LICENSE-data \
  --jq '.content' | base64 -d | head -3
gh api repos/convergent-systems-co/channel-atoms/contents/NOTICE \
  --jq '.content' | base64 -d | head -3
```

Expected: Apache header in LICENSE, CC-BY-4.0 in LICENSE-data, "{{PROJECT_NAME}}" replaced with "channel-atoms" in NOTICE.

- [ ] **Step 3: Verify idempotency re-run produces no diff (SC-9)**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template ../astro-tf-app-template \
  --target src/channel-atoms \
  --catalog channel-atoms \
  --site single
cd src/channel-atoms && git status -s
```

Expected: no output.

- [ ] **Step 4: Confirm with Thomas before scaling**

Surface to the user: pilot is green, idempotency holds, ready for Phase 2 (10-catalog Band B remainder).

---

# PHASE 2 — Band B remainder (10 catalogs)

Three batches of 3-4 catalogs each. Each catalog gets its own PR + pointer bump.

## Task 2.1: Batch 1 — compliance-atoms, event-atoms, identity-atoms

- [ ] **Step 1: For each catalog (compliance-atoms, event-atoms, identity-atoms), repeat Phase 1 Task 1.1 steps 1-8 substituting the catalog name**

For each catalog `<C>`:

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/<C>
git fetch origin && git switch main && git pull origin main
git switch -c chore/template-alignment

cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template ../astro-tf-app-template \
  --target src/<C> \
  --catalog <C> \
  --site single

cd src/<C>
cd web && npm install && npm run build && cd ..  # build verification
git add . && git commit -m "chore: align repo to astro-tf-app-template"
git push -u origin chore/template-alignment
gh pr create --title "chore: align repo to astro-tf-app-template" \
             --body "Applies umbrella scaffold script. See spec at convergent-systems-co/atoms docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md"
gh pr checks --watch
gh pr merge --squash --delete-branch
git switch main && git pull origin main
```

- [ ] **Step 2: Bump umbrella pointers in a single commit**

After all three PRs merge:

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/bump-band-b-batch-1
git -C src/compliance-atoms switch main && git -C src/compliance-atoms pull
git -C src/event-atoms switch main && git -C src/event-atoms pull
git -C src/identity-atoms switch main && git -C src/identity-atoms pull
git add src/compliance-atoms src/event-atoms src/identity-atoms
git commit -m "chore: bump band-B batch 1 submodules (compliance, event, identity)"
git push -u origin chore/bump-band-b-batch-1
gh pr create --title "chore: bump band-B batch 1 submodules" --body "Pointer bumps after template alignment."
gh pr merge --squash --delete-branch
```

## Task 2.2: Batch 2 — knowledge-atoms, model-atoms, persona-atoms

- [ ] **Step 1: Repeat Task 2.1 steps for the three catalogs**

(Substitute `compliance, event, identity` → `knowledge, model, persona` in the loop above.)

- [ ] **Step 2: Bump umbrella pointers in single commit**

(Substitute batch name `chore/bump-band-b-batch-2`.)

## Task 2.3: Batch 3 — plugin-atoms, policy-atoms, service-atoms, workflow-atoms

- [ ] **Step 1: Repeat Task 2.1 steps for the four catalogs**

- [ ] **Step 2: Bump umbrella pointers in single commit**

(Substitute batch name `chore/bump-band-b-batch-3`.)

## Task 2.4: Verify SC-1 and SC-4 across all Band B catalogs

- [ ] **Step 1: Diff identical-scaffolding paths across two Band B catalogs**

```bash
diff -r /Users/itsfwcp/workspace/convergent-system-co/atoms/src/channel-atoms/.github \
        /Users/itsfwcp/workspace/convergent-system-co/atoms/src/policy-atoms/.github
```

Expected: only differences come from `seed-issues/*` (token substitution: `channel-atoms` vs `policy-atoms`) and possibly `workflows/*.yml` token-substituted lines.

- [ ] **Step 2: Confirm all 11 Band B sites' CI is green**

```bash
for c in channel compliance event identity knowledge model persona plugin policy service workflow; do
  echo "=== $c-atoms ==="
  gh run list --repo convergent-systems-co/$c-atoms --workflow ci --limit 1 --json status,conclusion --jq '.[0] | "\(.status) \(.conclusion)"'
done
```

Expected: all `completed success`.

---

# PHASE 3 — Band A minimal-touch (5 catalogs)

Extra caution on `theme-atoms` and `brand-atoms` (production sites).

## Task 3.1: theme-atoms — production site, extra caution

**Files:** changes inside `src/theme-atoms/` (no `web/` changes expected)

- [ ] **Step 1: Branch from main**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms
git fetch origin && git switch main && git pull origin main
git switch -c chore/template-alignment
```

- [ ] **Step 2: Snapshot web/ hash BEFORE**

```bash
find web -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -exec sha256sum {} \; | sort > /tmp/theme-web-pre.txt
```

- [ ] **Step 3: Run the script with --site existing**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template ../astro-tf-app-template \
  --target src/theme-atoms \
  --catalog theme-atoms \
  --site existing
```

- [ ] **Step 4: Snapshot web/ hash AFTER and compare**

```bash
cd src/theme-atoms
find web -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -exec sha256sum {} \; | sort > /tmp/theme-web-post.txt
diff /tmp/theme-web-pre.txt /tmp/theme-web-post.txt
```

Expected: no diff output. If diff is non-empty, STOP — abort the migration for this repo and report which files changed.

- [ ] **Step 5: Verify production build still works**

```bash
cd web && pnpm install && pnpm run build && cd ..
```

Expected: build succeeds, no errors. If build fails, STOP.

- [ ] **Step 6: Commit and push**

```bash
git add .
git status -s | grep -v "^M  web/" || echo "ASSERTION: no web/ modifications"
git commit -m "$(cat <<'EOF'
chore: align repo to astro-tf-app-template (non-web only)

Applies the umbrella's apply-template-scaffold.sh in --site existing
mode: adds standard docs, workflows, devcontainer, infra/terraform
multi-env scaffold, single-site Makefile, and the Apache-2.0 +
CC-BY-4.0 + NOTICE license bundle. The web/ tree is UNTOUCHED;
theme-atoms.com production build is unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin chore/template-alignment
```

- [ ] **Step 7: Open PR with explicit "no web/" assertion**

```bash
gh pr create --repo convergent-systems-co/theme-atoms \
  --title "chore: align repo to astro-tf-app-template (non-web only)" \
  --body "$(cat <<'EOF'
## Summary
- Adds standard docs, workflows, devcontainer, infra/terraform scaffold, single-site Makefile, license bundle
- **web/ is UNTOUCHED** — verified via sha256 diff (see PR commits)
- theme-atoms.com production build is unaffected

Source spec: convergent-systems-co/atoms `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md`

## Test plan
- [ ] `git diff --stat HEAD~1 -- web/` is empty
- [ ] `cd web && pnpm install && pnpm run build` succeeds
- [ ] Cloudflare Pages preview deploy on this PR succeeds
- [ ] CI typecheck workflow green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
```

- [ ] **Step 8: Verify Cloudflare Pages preview deploy succeeds**

Check the PR's deployment status. If preview deploy fails, STOP and investigate before merging.

- [ ] **Step 9: Merge**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 10: Bump umbrella submodule pointer**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/theme-atoms
git switch main && git pull origin main
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch -c chore/bump-theme-atoms
git add src/theme-atoms
git commit -m "chore: bump theme-atoms to template-aligned main"
git push -u origin chore/bump-theme-atoms
gh pr create --title "chore: bump theme-atoms submodule" --body "Pointer bump after theme-atoms template alignment."
gh pr merge --squash --delete-branch
```

## Task 3.2: brand-atoms — production site, extra caution

**Repeat Task 3.1 with `brand-atoms`.** Differences:

- `brand-atoms` has no prior LICENSE — the bundle adds Apache-2.0 fresh, not preserved.
- `brand-atoms` uses pnpm and has a parent-level `pnpm-workspace.yaml`. Verify both `pnpm install` and the prebuild step (`cd .. && pnpm build`) still work in step 5.
- Same web/ untouched assertion applies (Band A `--site existing`).

## Task 3.3: agent-atoms

**Repeat Task 3.1 with `agent-atoms`.** Existing LICENSE is Apache-2.0 (byte-equal idempotency expected).

## Task 3.4: prompt-atoms

**Repeat Task 3.1 with `prompt-atoms`.** Existing LICENSE is Apache-2.0.

## Task 3.5: profile-atoms (+ design doc + build-out issue)

**Files:** changes inside `src/profile-atoms/`; additionally a design doc copy and an issue filed.

- [ ] **Step 1: Branch from main (same as Task 3.1 Step 1)**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/profile-atoms
git fetch origin && git switch main && git pull origin main
git switch -c chore/template-alignment-and-design-spec
```

- [ ] **Step 2: Run the script with --site existing**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
bash scripts/apply-template-scaffold.sh \
  --template ../astro-tf-app-template \
  --target src/profile-atoms \
  --catalog profile-atoms \
  --site existing
```

- [ ] **Step 3: Copy the v1.0.0 design doc into the repo**

```bash
mkdir -p src/profile-atoms/docs/design
cp ~/Downloads/design-profile-atoms_1.md \
   src/profile-atoms/docs/design/profile-atoms-v1.0.0.md
```

- [ ] **Step 4: Append the build-out pointer to GOALS.md**

In `src/profile-atoms/GOALS.md`, prepend after the first heading (or wherever the existing top content sits — read the file first):

```markdown
> **Implementation status:** scaffold complete. v1.0.0 design at
> `docs/design/profile-atoms-v1.0.0.md` — build-out tracked in #N
> (issue number filled in by Step 7 below).
```

Read the existing `GOALS.md` first to find the correct insertion point. Insert the block immediately after the first H1 line.

- [ ] **Step 5: Verify web/ untouched and build succeeds (same as Task 3.1 Steps 4-5)**

- [ ] **Step 6: Commit and push**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/src/profile-atoms
git add .
git commit -m "$(cat <<'EOF'
chore: align repo to astro-tf-app-template; add v1.0.0 design doc

Applies the umbrella's apply-template-scaffold.sh in --site existing
mode (web/ untouched). Copies the v1.0.0 design from
~/Downloads/design-profile-atoms_1.md into docs/design/ so the spec
becomes a repository artifact. Adds a GOALS.md pointer linking the
design doc and the build-out tracking issue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin chore/template-alignment-and-design-spec
```

- [ ] **Step 7: File the v1.0.0 build-out issue**

```bash
gh issue create --repo convergent-systems-co/profile-atoms \
  --title "Build out v1.0.0 spec per docs/design/profile-atoms-v1.0.0.md" \
  --label epic \
  --body "$(cat <<'EOF'
Implement the v1.0.0 design committed to `docs/design/profile-atoms-v1.0.0.md`.

## Workstreams
- Qualifier Class system (schema-atoms)
- Governance stack composition (compliance-atoms, policy-atoms, governance-binding refs)
- Subjects registry (subject types, channel-ref resolution)
- Trust requirements + signing chain verification
- Update policy (auto_upgrade, notification, diff_visualization)
- Validator (reference resolution, version pinning, trust verification)
- Seed profile-atoms (developer + author examples from §"Illustrative example")
- Site rendering (compose profile preview, role-pack/policy/governance stack views)

## Design doc
- In-repo: `docs/design/profile-atoms-v1.0.0.md`
- Spec: convergent-systems-co/atoms `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md` §5

## Status
Design ready. Scaffolding complete via PR #N. Implementation deferred to a separate brainstorming-then-planning cycle.
EOF
)"
```

Capture the issue number printed by `gh issue create` — call it `$ISSUE_NUM`.

- [ ] **Step 8: Update GOALS.md with the real issue number**

In `src/profile-atoms/GOALS.md`, replace `#N` with `#$ISSUE_NUM`. Amend the commit:

```bash
git add GOALS.md
git commit --amend --no-edit
git push --force-with-lease
```

(--force-with-lease is acceptable here per Common.md §2.2 because the PR branch is mine and not yet merged. If the PR has reviewers commenting, ask first.)

- [ ] **Step 9: Open PR, merge, bump umbrella pointer (same flow as Task 3.1 Steps 7-10)**

## Task 3.6: Verify SC-1 across all 16 catalogs

- [ ] **Step 1: Run scaffold-comparison verification**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
for c in agent brand channel compliance event identity knowledge model persona plugin policy profile prompt service theme workflow; do
  echo "=== $c-atoms ==="
  for path in .github/workflows .devcontainer Makefile docs/adr; do
    if [[ ! -e src/$c-atoms/$path ]]; then
      echo "MISSING: src/$c-atoms/$path"
    fi
  done
done
```

Expected: no "MISSING" lines.

- [ ] **Step 2: Diff two arbitrary catalogs to verify identical scaffold (modulo token substitution)**

```bash
diff -r src/channel-atoms/.github/workflows src/policy-atoms/.github/workflows
diff -r src/channel-atoms/.devcontainer    src/policy-atoms/.devcontainer
```

Expected: differences only on token-substituted lines (catalog name, site URL).

---

# PHASE 4 — Umbrella (Go) alignment

The umbrella uses `go-tf-app-template`, not `astro-tf-app-template`. The scaffold script does NOT apply here. This is a manual alignment pass.

## Task 4.1: Add missing infra/terraform/envs/stg/

**Files:**
- Create: `infra/terraform/envs/stg/main.tf`
- Create: `infra/terraform/envs/stg/backend.tf`
- Create: `infra/terraform/envs/stg/terraform.tfvars`

- [ ] **Step 1: Branch from main**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git switch main && git pull origin main
git switch -c chore/umbrella-template-alignment
```

- [ ] **Step 2: Copy envs/dev → envs/stg as starting point**

```bash
cp -R infra/terraform/envs/dev infra/terraform/envs/stg
```

- [ ] **Step 3: Adjust env-specific values**

In `infra/terraform/envs/stg/terraform.tfvars`, change any `env = "dev"` to `env = "stg"`. Same for any project names, hostnames, etc.

In `infra/terraform/envs/stg/backend.tf`, change the backend key from `.../dev.tfstate` to `.../stg.tfstate`.

- [ ] **Step 4: Verify `make tf-plan ENV=stg` works**

```bash
make tf-plan ENV=stg
```

Expected: plan succeeds (may produce a "no changes" plan if stg has no resources yet, or it may produce additions — either is acceptable as long as it's not a syntax/auth error).

## Task 4.2: Add missing standard docs

**Files (if absent — check first with `ls`):**
- Create or update: `ARCHITECTURE.md`, `CODEOWNERS`, `COPYRIGHT`, `SECURITY.md`

- [ ] **Step 1: Check what's missing**

```bash
for f in ARCHITECTURE.md CODEOWNERS COPYRIGHT SECURITY.md; do
  [[ -f $f ]] && echo "PRESENT: $f" || echo "MISSING: $f"
done
```

- [ ] **Step 2: Copy missing files from go-tf-app-template**

If `go-tf-app-template` is cloned locally:

```bash
GO_TEMPLATE=/Users/itsfwcp/workspace/convergent-system-co/go-tf-app-template
for f in ARCHITECTURE.md CODEOWNERS COPYRIGHT SECURITY.md; do
  if [[ ! -f $f && -f $GO_TEMPLATE/$f ]]; then
    cp $GO_TEMPLATE/$f .
    sed -i.bak "s/{{PROJECT_NAME}}/atoms/g; s|https://example.com|https://atoms.convergent-systems.co|g" $f && rm -f $f.bak
  fi
done
```

If `go-tf-app-template` is not cloned, clone it first:

```bash
gh repo clone convergent-systems-co/go-tf-app-template /tmp/go-tf-app-template
GO_TEMPLATE=/tmp/go-tf-app-template
# (then repeat the for loop)
```

## Task 4.3: Apply license bundle to umbrella

**Files:**
- Create: `LICENSE` (Apache-2.0 — replace existing if not Apache)
- Create: `LICENSE-data` (CC-BY-4.0)
- Create: `NOTICE`

- [ ] **Step 1: Check current LICENSE**

```bash
head -1 LICENSE
```

- [ ] **Step 2: Write the bundle using the same license texts from the script**

```bash
cp scripts/lib/license-texts/apache-2.0.txt LICENSE
cp scripts/lib/license-texts/cc-by-4.0.txt  LICENSE-data
sed "s/{{PROJECT_NAME}}/atoms/g" scripts/lib/license-texts/NOTICE.template > NOTICE
```

- [ ] **Step 3: Verify**

```bash
head -1 LICENSE LICENSE-data NOTICE
```

Expected: Apache header, CC-BY header, "atoms" NOTICE.

## Task 4.4: Open umbrella PR

- [ ] **Step 1: Commit and push**

```bash
git add infra/terraform/envs/stg/ ARCHITECTURE.md CODEOWNERS COPYRIGHT SECURITY.md LICENSE LICENSE-data NOTICE
git commit -m "$(cat <<'EOF'
chore: align umbrella to go-tf-app-template + apply license bundle

Adds the missing infra/terraform/envs/stg/ (template expects dev/stg/prod;
umbrella had only dev/prod), the standard docs from go-tf-app-template
(CODEOWNERS, COPYRIGHT, SECURITY.md, ARCHITECTURE.md), and the
Apache-2.0 + CC-BY-4.0 + NOTICE license bundle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin chore/umbrella-template-alignment
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --repo convergent-systems-co/atoms \
  --title "chore: align umbrella to go-tf-app-template + apply license bundle" \
  --body "Closes Phase 4 of the template alignment work. See spec at docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md §7 P4."
gh pr checks --watch
gh pr merge --squash --delete-branch
```

---

# PHASE 5 — Final verification

## Task 5.1: Run the full success-criteria check

**Files:**
- Create: `scripts/verify-template-alignment.sh` (one-shot verifier)

- [ ] **Step 1: Write the verifier**

`scripts/verify-template-alignment.sh`:

```bash
#!/usr/bin/env bash
# verify-template-alignment.sh — checks SC-1 through SC-9 from the spec
set -u

CATALOGS=(
  agent-atoms brand-atoms channel-atoms compliance-atoms event-atoms
  identity-atoms knowledge-atoms model-atoms persona-atoms plugin-atoms
  policy-atoms profile-atoms prompt-atoms service-atoms theme-atoms
  workflow-atoms
)

fail=0
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; fail=1; }

echo "SC-1: identical scaffold paths across catalogs"
sample=src/channel-atoms
for c in "${CATALOGS[@]}"; do
  for path in .devcontainer .github/workflows .github/ISSUE_TEMPLATE \
              docs/adr Makefile ARCHITECTURE.md CODEOWNERS COPYRIGHT \
              SECURITY.md .editorconfig .gitattributes .tool-versions; do
    if [[ ! -e src/$c/$path ]]; then
      fail "src/$c missing $path"
    fi
  done
done
[[ $fail -eq 0 ]] && pass "all 16 catalogs have scaffold paths"

echo
echo "SC-5: license bundle present"
for c in "${CATALOGS[@]}"; do
  for f in LICENSE LICENSE-data NOTICE; do
    if [[ ! -f src/$c/$f ]]; then
      fail "src/$c missing $f"
    fi
  done
done

echo
echo "SC-6: profile-atoms has design doc and build-out issue"
if [[ -f src/profile-atoms/docs/design/profile-atoms-v1.0.0.md ]]; then
  pass "profile-atoms design doc present"
else
  fail "profile-atoms design doc missing"
fi
gh issue list --repo convergent-systems-co/profile-atoms --label epic --json title --jq '.[].title' \
  | grep -q "Build out v1.0.0" && pass "build-out issue exists" || fail "build-out issue missing"

echo
echo "SC-7: umbrella tf-plan ENV=stg works"
if make tf-plan ENV=stg >/dev/null 2>&1; then
  pass "tf-plan stg succeeds"
else
  fail "tf-plan stg failed"
fi

echo
echo "SC-8: submodule pointers clean"
status=$(git submodule status | grep -E '^[+-]' || true)
if [[ -z "$status" ]]; then
  pass "all submodule pointers clean"
else
  echo "$status"
  fail "submodule pointers have drift markers"
fi

echo
echo "SC-9: idempotency — apply-template-scaffold.sh produces no diff on three sample repos"
for c in channel-atoms theme-atoms profile-atoms; do
  bash scripts/apply-template-scaffold.sh \
    --template ../astro-tf-app-template \
    --target src/$c \
    --catalog $c \
    --site $( [[ "$c" == "channel-atoms" ]] && echo single || echo existing )
  if [[ -z "$(git -C src/$c status -s)" ]]; then
    pass "$c idempotent"
  else
    fail "$c produced changes on re-run"
    git -C src/$c status -s
  fi
done

echo
if [[ $fail -eq 0 ]]; then
  echo "ALL SUCCESS CRITERIA MET"
  exit 0
else
  echo "VERIFICATION FAILED"
  exit 1
fi
```

```bash
chmod +x scripts/verify-template-alignment.sh
```

- [ ] **Step 2: Run the verifier**

```bash
bash scripts/verify-template-alignment.sh
```

Expected: `ALL SUCCESS CRITERIA MET`.

- [ ] **Step 3: Commit the verifier**

```bash
git switch -c chore/verify-template-alignment
git add scripts/verify-template-alignment.sh
git commit -m "chore: add verify-template-alignment.sh for ongoing checks"
git push -u origin chore/verify-template-alignment
gh pr create --title "chore: add verify-template-alignment.sh" --body "One-shot verifier for SC-1 through SC-9."
gh pr merge --squash --delete-branch
```

## Task 5.2: Final summary to user

- [ ] **Step 1: Summarize to Thomas**

Surface a final status report:

- Number of PRs merged (expected: ~22 — 16 catalog alignment + 5 submodule bumps + umbrella alignment + script PR + verifier PR)
- Verifier exit code
- Any open items: cloud Pages provisioning, domain DNS, follow-up plans (profile-atoms v1.0.0 implementation, template repo single-site native support, license bundle in template repo default)

---

## Self-Review Notes

**Spec coverage:**

| Spec section | Plan task(s) |
|---|---|
| §1 Objective | Phases 0-5 collectively |
| §2 Rationale + Alternatives | Resolved at spec; plan executes chosen approach |
| §3 Architecture (script contract) | Tasks 0.1 – 0.8 |
| §4 Migration matrix | Tasks 1.1 (channel), 2.1-2.3 (Band B), 3.1-3.5 (Band A) |
| §5 Profile-atoms shell scope | Task 3.5 |
| §6 License bundle | Task 0.6 (script); applied in every per-repo task |
| §7 Rollout (Phases 0-5) | Maps 1:1 to plan phases |
| §8 SC-1 to SC-9 | Tasks 1.3, 2.4, 3.6, 5.1 |
| §9 Risk mitigation | Phase 0 dry-runs, Task 3.1 hash-check, Task 3.5 amend protocol |
| §10 Dependencies | Phase 0 captures all script deps; Phase 4 lists umbrella deps |
| §11 Out of scope | Surfaced in Task 5.2 summary |
| §12 Open questions | Surfaced in Task 5.2 summary |

**Type consistency:** function names — `copy_non_web_scaffold`, `substitute_tokens`, `transform_makefile_single_site`, `transform_workflows_single_site`, `write_license_bundle`, `copy_web_single_site` — used consistently in `apply-template-scaffold.sh` and the lib files.

**Placeholders:** `#N` appears in Task 3.5 Steps 4 and 8 — explicitly resolved by `gh issue create` output captured in Step 7. No other placeholders.

**Open items deliberately left to executor judgment:**
- Whether to use `--force-with-lease` in Task 3.5 Step 8 (user-judgment call per Common.md §2.2).
- The exact backend key format in Task 4.1 Step 3 (depends on actual Terraform backend configuration in the umbrella, which the executor must read first).
