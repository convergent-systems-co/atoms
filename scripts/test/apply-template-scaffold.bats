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
