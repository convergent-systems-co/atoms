# atoms

> Umbrella catalog-of-catalogs for every `*-atoms` catalog in the [Convergent Systems](https://xdao.co) ecosystem. Live at [**atoms.convergent-systems.co**](https://atoms.convergent-systems.co).

`atoms` hosts the canonical [Atom Spec](./spec/atom-spec.md), the catalog registry, the trust-root key registry, and an aggregated directory of every recognized catalog. It is itself a catalog conforming to the Spec (Part VII §31 — the catalog of catalogs).

It is not a monorepo. Each catalog stays its own repository — donatable, transferable, federatable, with its own release cycle. `atoms` pins each via git submodule under `src/<catalog>-atoms/`, so a single clone with `--recurse-submodules` materializes the whole ecosystem.

## What's published

| Path | What |
|---|---|
| [`/spec/atom-spec.md`](https://atoms.convergent-systems.co/spec/atom-spec.md) | Normative Atom Spec, markdown |
| [`/spec/atom-spec.toml`](https://atoms.convergent-systems.co/spec/atom-spec.toml) | Spec as a signed atom (canonical) |
| [`/catalogs/<id>.toml`](https://atoms.convergent-systems.co/catalogs/) | One signed registry entry per catalog |
| [`/catalogs/index.toml`](https://atoms.convergent-systems.co/catalogs/index.toml) | Catalog index (signed) |
| [`/keys/root.toml`](https://atoms.convergent-systems.co/keys/root.toml) | Root signing key public record (self-signed) |
| [`/keys.toml`](https://atoms.convergent-systems.co/keys.toml) | Umbrella key registry (Spec §20) |
| [`/directory.json`](https://atoms.convergent-systems.co/directory.json) | Live runtime aggregation (atom counts, status) |

All atoms are Ed25519-signed by the umbrella root key (`ed25519:P6+CekZ4v8Y+h4AUvxnVoGc9scE4kwOn3Ee46/3P65Y=`).

## Repository layout

```
spec/                    Spec source + signed atom outputs
catalogs/                Signed catalog registry atoms
keys/                    Trust root records
keys.toml                Umbrella key registry

src/                     Go workspace + atom submodules
  cmd/atoms/             `atoms` CLI binary (slice 4 — pending)
  internal/              internal Go packages
  pkg/                   public Go packages
  plugins/               Go-loadable plugins (deferred)
  <catalog>-atoms/ × 16  git submodules

web/                     Astro frontend (Cloudflare Pages)
infra/terraform/         Multi-env Terraform (modules/ + envs/{dev,prod}/)
scripts/                 Signing + tooling
docs/adr/                Architecture decisions (MADR)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full component diagram.

## Clone

```bash
git clone --recurse-submodules https://github.com/convergent-systems-co/atoms.git
# or after a plain clone:
git submodule update --init --recursive
```

## Catalogs (16)

| Catalog | Status | What it catalogs |
|---|---|---|
| [`brand-atoms`](./src/brand-atoms) | Bootstrap | Brand standards — palettes, fonts, glyphs |
| [`theme-atoms`](./src/theme-atoms) | Bootstrap | Themes — prompt segments, separators, role bindings |
| [`prompt-atoms`](./src/prompt-atoms) | Bootstrap | LLM prompt fragments — personas, constraints, formats |
| [`agent-atoms`](./src/agent-atoms) | Bootstrap | AI agent primitives — personas, tools, capabilities |
| [`persona-atoms`](./src/persona-atoms) | Bootstrap | AI persona profiles — voice, role, tone parameters |
| [`profile-atoms`](./src/profile-atoms) | Bootstrap | User and product profiles |
| [`channel-atoms`](./src/channel-atoms) | Bootstrap | Channels — protocols, endpoints, delivery semantics |
| [`model-atoms`](./src/model-atoms) | Bootstrap | Model registry — capabilities, context windows, pricing |
| [`service-atoms`](./src/service-atoms) | Bootstrap | Service primitives — identities, protocols, endpoints |
| [`policy-atoms`](./src/policy-atoms) | Bootstrap | Governance rules — subjects, resources, actions |
| [`identity-atoms`](./src/identity-atoms) | Bootstrap | Identity — auth methods, claims, trust frameworks |
| [`compliance-atoms`](./src/compliance-atoms) | Bootstrap | Compliance — SOC2, HIPAA, ISO27001, GDPR mappings |
| [`workflow-atoms`](./src/workflow-atoms) | Bootstrap | Workflows — steps, triggers, states, gates |
| [`event-atoms`](./src/event-atoms) | Bootstrap | Events — types, schemas, channels |
| [`knowledge-atoms`](./src/knowledge-atoms) | Bootstrap | Knowledge graph — entities, relationships, provenance |
| [`plugin-atoms`](./src/plugin-atoms) | Bootstrap | Plugin interfaces — contracts, capabilities, lifecycle |

Live aggregation status (atom counts, deploy state) at [`/directory.json`](https://atoms.convergent-systems.co/directory.json).

## Development

```bash
make help              # list targets
make build             # build the atoms CLI binary (dist/atoms)
make test              # run Go tests across the workspace
make lint              # golangci-lint
make web-build         # build the Astro umbrella site
make tf-plan ENV=prod  # plan production infra
make sign              # re-sign Spec + registry + key records (needs 1Password CLI)
```

The signing operation needs an active 1Password CLI session with access to the `Convergent Systems LLC / atoms-root` item. CI never holds the private key; signed atoms are committed under `spec/`, `catalogs/`, `keys/`.

## Updating submodules

```bash
git submodule update --remote --merge
git add src/
git commit -m "chore: bump submodule pointers"
git push
```

## Related repos

Not submodules; ecosystem peers and runtimes:

- **[xdao](https://github.com/convergent-systems-co/xdao)** — Federation portal (`xdao.co`)
- **[xaips](https://github.com/convergent-systems-co/xaips)** — RFC-style governance
- **[aish](https://github.com/convergent-systems-co/aish)** — AI-native shell (runtime consumer)
- **olympus** — AI development runtime
- **universal-bus** — Future service-layer runtime

## License

Apache-2.0 — see [`LICENSE`](./LICENSE). Each submodule carries its own Apache-2.0 license.
