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
