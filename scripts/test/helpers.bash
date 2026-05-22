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
