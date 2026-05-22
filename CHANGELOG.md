# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Migration to `go-tf-app-template` layout: Go workspace skeleton under
  `src/` (`cmd/atoms`, `internal`, `pkg`, `plugins`), multi-env Terraform
  under `infra/terraform/{modules,envs}/`, CI workflows for Go lint/test/build
  and Terraform plan, scaffold docs (ARCHITECTURE, CONTRIBUTING, SECURITY,
  ADR starter), Makefile, Dockerfile, golangci, goreleaser, devcontainer.
- Spec hosting + catalog registry at the umbrella site
  (`/spec/`, `/catalogs/`, `/keys/`). 23 signed atoms published.
- Ed25519 root key (`ed25519:P6+CekZ4v8Y+h4AUvxnVoGc9scE4kwOn3Ee46/3P65Y=`)
  established per Spec Part IX §40, held in 1Password
  (`Convergent Systems LLC / atoms-root`).

### Changed

- All atom catalogs moved from repo root to `src/<catalog>-atoms/` as git
  submodules.
- Umbrella domain corrected from `.com` to `.co`
  (`atoms.convergent-systems.co`). Individual catalog domains remain
  `<catalog>-atoms.com`.

### Infrastructure

- Cloudflare Pages project (`atoms-umbrella`) is now provisioned via the
  multi-env Terraform layout. The active environment is `prod`; `dev` is
  scaffolded but not yet bound to live infrastructure.
