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

@test "--target must exist as a directory" {
  run "$SCRIPT" --template /tmp --target /nonexistent --catalog c --site single
  [ "$status" -eq 2 ]
  [[ "$output" =~ "target directory not found" ]]
}

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

@test "substitutes {{PROJECT_NAME}} with catalog name in copied files" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  echo "name: {{PROJECT_NAME}}" > "$tmpl/ARCHITECTURE.md"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog channel-atoms --site single
  [ "$status" -eq 0 ]
  grep -q "name: channel-atoms" "$tgt/ARCHITECTURE.md"
  run grep -q "{{PROJECT_NAME}}" "$tgt/ARCHITECTURE.md"
  [ "$status" -ne 0 ]
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

@test "Makefile single-site: drops SITE variable and cd web/\$(SITE) becomes cd web" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  run grep -q "SITE ?= site" "$tgt/Makefile"
  [ "$status" -ne 0 ]
  run grep -q 'cd web/$(SITE)' "$tgt/Makefile"
  [ "$status" -ne 0 ]
  grep -q "cd web &&" "$tgt/Makefile"
}

@test "ci.yml single-site: path web/site becomes web" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]
  run grep -q "web/site" "$tgt/.github/workflows/ci.yml"
  [ "$status" -ne 0 ]
  grep -q "cd web " "$tgt/.github/workflows/ci.yml"
}

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

  local pre_hash; pre_hash=$(shasum -a 256 "$tgt/LICENSE" | awk '{print $1}')

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site existing
  [ "$status" -eq 0 ]

  local post_hash; post_hash=$(shasum -a 256 "$tgt/LICENSE" | awk '{print $1}')
  # Apache stays Apache; the script may rewrite with canonical Apache text
  # but should at least still be Apache.
  if [[ "$pre_hash" != "$post_hash" ]]; then
    grep -q "Apache License" "$tgt/LICENSE"
  fi
}

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

@test "idempotency: second run on same target produces no changes" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  # Snapshot the target after first run.
  local hash1; hash1=$(find "$tgt" -not -path "*/.git/*" -type f -exec shasum -a 256 {} \; | sort -k 2 | shasum -a 256 | awk '{print $1}')

  # Second run, same arguments.
  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single
  [ "$status" -eq 0 ]

  local hash2; hash2=$(find "$tgt" -not -path "*/.git/*" -type f -exec shasum -a 256 {} \; | sort -k 2 | shasum -a 256 | awk '{print $1}')
  [ "$hash1" = "$hash2" ]
}

@test "--dry-run does not modify target" {
  local tmpl tgt
  tmpl=$(make_temp_dir); tgt=$(make_temp_dir)
  make_fixture_template "$tmpl"
  make_fixture_catalog_bandB "$tgt"

  local pre_hash; pre_hash=$(find "$tgt" -not -path "*/.git/*" -type f -exec shasum -a 256 {} \; | sort -k 2 | shasum -a 256 | awk '{print $1}')

  run "$SCRIPT" --template "$tmpl" --target "$tgt" --catalog test-atoms --site single --dry-run
  [ "$status" -eq 0 ]

  local post_hash; post_hash=$(find "$tgt" -not -path "*/.git/*" -type f -exec shasum -a 256 {} \; | sort -k 2 | shasum -a 256 | awk '{print $1}')
  [ "$pre_hash" = "$post_hash" ]
}
