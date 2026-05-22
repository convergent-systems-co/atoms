# The Atom Spec

> **Status:** v1.0.0 — Constitutional design for the `*-atoms` ecosystem.
>
> **Scope:** This document is the normative specification that every atom catalog conforms to. It defines what an atom is, how catalogs are structured, how references resolve, how trust is established, how versions evolve, and how the ecosystem is discovered through `atoms.convergent-systems.co`. Every individual catalog design (brand-atoms, theme-atoms, schema-atoms, profile-atoms, policy-atoms, and all future catalogs) is an implementation of this Spec.
>
> **Conformance language:** This document uses MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in the senses defined by RFC 2119. Catalogs that conform to this Spec MUST satisfy every MUST requirement.

---

## Table of Contents

- Part I: The Atom
- Part II: The Catalog
- Part III: References
- Part IV: Trust
- Part V: Lifecycle
- Part VI: Converters
- Part VII: The Catalog of Catalogs (atoms.convergent-systems.co)
- Part VIII: The Builder Contract
- Part IX: Bootstrap and Self-Reference
- Part X: Governance of the Spec
- Part XI: Open Questions

---

## Preamble

An atom is a unit of typed, signed, versioned, machine-readable knowledge — a single coherent thing that can be referenced, composed, validated, and distributed. The atom catalogs (`brand-atoms`, `theme-atoms`, `schema-atoms`, `profile-atoms`, `policy-atoms`, and others) are public commons of such atoms, organized by domain.

The atom ecosystem exists to solve a class of problems that traditional data interchange formats handle poorly: how to express durable, evolving, multi-author knowledge in forms that AI agents, design tools, build systems, and humans all consume as canonical truth, without any of them becoming the source-of-record by default.

The Spec is what makes the catalogs coherent. Without it, every catalog would invent its own conventions, and cross-catalog references, shared tooling, and ecosystem-level discovery would be impossible. The Spec is the minimum agreement every catalog accepts so that the ecosystem holds together.

The Spec itself is published as an atom — specifically, as a versioned text in the `atoms.convergent-systems.co/spec/` catalog. The Spec is its own first instance.

This document is the canonical source for v1.0.0 of the Spec. Future versions follow the governance defined in Part X.

---

## Part I: The Atom

### 1. Definition

An atom is a discrete, self-contained, machine-readable artifact representing one unit of typed knowledge within a catalog. Every atom MUST be expressible as a single canonical TOML document. Every atom MUST be uniquely identifiable, cryptographically signed, and semantically versioned.

### 2. Universal Identity Fields

Every atom MUST contain the following identity fields. These fields are universal across all catalogs and all classes within catalogs.

**`canonical_name`** (string, required) — A globally unique name within the atom's home catalog, formed as `<namespace>/<class>/<slug>`. The `namespace` identifies the publisher or organization. The `class` identifies the class within the catalog (see Part II). The `slug` identifies the atom within its class.

**`version`** (string, required) — A semantic version conforming to SemVer 2.0.0. Versions MUST be immutable once published — a version-pinned reference MUST always resolve to the same atom contents.

**`atom_type`** (string, required) — A reference to the atom type, formed as `<catalog>/<class>`. Example: `brand-atoms/palette`, `theme-atoms/theme`, `policy-atoms/policy`. The atom_type determines which schema validates the body.

**`authored_by`** (signing key identifier, required) — The Ed25519 public key fingerprint of the entity that authored this atom. The author's signature MUST be present in `signatures`.

**`signed_by`** (array of signing key identifiers, optional) — Public key fingerprints of additional signers. Used for co-signing and endorsement.

**`signatures`** (structured value, required) — A map from signing key identifier to its detached Ed25519 signature over the canonical hash of the atom's body. The author's signature MUST be present.

**`created_at`** (RFC 3339 timestamp, required) — The instant the atom version was first signed and published.

**`dependencies`** (array of references, optional) — Other atoms this atom transitively requires. See Part III for reference format.

**`spec_version`** (string, required) — The version of the Atom Spec this atom conforms to. Allows consumers to dispatch behavior based on Spec version.

### 3. The Atom Body

Every atom MUST contain a `body` field whose structure depends on the atom's `atom_type`. The body is validated against the structural schema for that atom_type, which is itself an atom in the `schema-atoms` catalog.

The body MUST be a TOML table. The body MUST NOT contain fields with the same names as the universal identity fields — those are reserved.

The body's content is the atom's actual payload — the palette swatches for a palette atom, the policy expression for a policy atom, the role-pack composition for a role-pack atom.

### 4. Canonical Serialization

The canonical serialization format of every atom is TOML, conforming to the TOML 1.0.0 specification.

Catalogs MAY serve atoms in other formats via converters (Part VI). The canonical form — the form that gets signed, hashed, stored in the catalog, and treated as authoritative — is always TOML.

### 5. Atom File Layout

The canonical on-disk form of an atom is a single TOML file with the following structure:

```toml
spec_version = "1.0.0"
canonical_name = "<namespace>/<class>/<slug>"
version = "1.0.0"
atom_type = "<catalog>/<class>"
authored_by = "ed25519:<fingerprint>"
signed_by = ["ed25519:<fingerprint>", ...]
created_at = "2026-01-15T14:32:00Z"

[dependencies]
# optional array of reference objects

[signatures]
"ed25519:<fingerprint>" = "<base64-signature>"

[body]
# class-specific content, validated against schema-atoms
```

The `[body]` section's structure varies by atom_type. All other sections are universal.

### 6. Hashing

The canonical hash of an atom is the SHA-256 of the canonically-serialized TOML with the `[signatures]` section removed. Signatures are computed over this hash.

Two atoms with identical content MUST produce identical hashes. Catalogs MUST canonicalize TOML (sorted keys, normalized whitespace, normalized number representation) before hashing.

---

## Part II: The Catalog

### 7. Catalog Definition

A catalog is a curated collection of atoms, typically scoped to a single domain (branding, themes, policies, profiles, etc.). Every catalog MUST conform to this Spec.

A catalog is identified by its canonical domain (e.g., `brand-atoms.com`, `theme-atoms.com`). The catalog's domain is the catalog's root URL for atom retrieval.

### 8. The Catalog Manifest

Every catalog MUST publish a catalog manifest at `<catalog-domain>/catalog.toml`. The manifest is itself an atom of type `atoms.convergent-systems.co/catalog-manifest`. The manifest declares:

- The catalog's canonical name and current version
- The Spec version the catalog implements
- The classes the catalog hosts (see §9)
- The contribution governance (who can publish, what review process applies)
- The signing requirements (who can sign atoms in this catalog)
- The contact information for the catalog's maintainers

Consumers fetch the catalog manifest first when interacting with a catalog they haven't seen before. The manifest is the catalog's self-description.

### 9. Classes

A catalog organizes its atoms into classes. A class is a sub-grouping with its own body schema, its own narrowing label vocabulary, and its own URL path.

Examples:
- `brand-atoms` has classes `palettes`, `fonts`, `brands`, `logos`, `layouts`
- `theme-atoms` has classes `themes`, `fonts`
- `schema-atoms` has classes `structural`, `vocabularies`, `grammars`, `types`

A catalog MUST declare its classes in the catalog manifest. Each class declaration MUST include:

- The class name (lowercase, hyphenated)
- A reference to the structural schema-atom that validates atoms in this class
- The narrowing label vocabulary for this class (see §10)
- The signing requirements (which may differ between classes)

Classes within a catalog MUST be disjoint — every atom belongs to exactly one class. A catalog MAY add classes over time (a compatible change) but MUST NOT remove or rename classes without going through the breaking-change process (§22).

### 10. Narrowing Labels

Atoms within a class carry narrowing labels — typed metadata that facet the atom for search and discovery. Examples:

- A font atom might carry `weight: heavy`, `family: serif`, `supports: [cyrillic, latin, greek]`
- A theme atom might carry `mood: dark`, `style: minimalist`, `compatible_with: [aish, vim, iterm2]`
- A policy atom might carry `domain: compliance`, `regime: soc2`, `severity: blocking`

Narrowing labels MUST be typed. Each label has a name and a typed value. The valid labels for a class — including label names and accepted values for each — are declared in the class's narrowing label vocabulary, which is itself an atom in `schema-atoms/vocabularies`.

Narrowing labels MUST appear in the atom body in a reserved `[body.labels]` section. Atoms MAY omit labels that don't apply, but MUST NOT use label names not declared in the class's vocabulary.

Narrowing labels are queryable. Catalogs SHOULD support search by label: "find atoms in this class where label X equals value Y."

### 11. The URL Convention

Every atom in a catalog MUST be fetchable at a deterministic URL formed as:

```
<catalog-domain>/<class>/<slug>.toml
```

For version-specific access:

```
<catalog-domain>/<class>/<slug>@<version>.toml
```

For latest-version access:

```
<catalog-domain>/<class>/<slug>.toml
```

(without a version suffix, the URL serves the catalog's current released version of that atom).

This URL convention is the read API of every catalog. Catalogs MUST support these URL patterns. Consumers MAY fetch any atom from any catalog using only the URL pattern without prior coordination.

URLs MUST be stable for the lifetime of the atom version. Once an atom version is published at a URL, the URL MUST continue to serve that version even if the latest-version URL changes.

URLs MUST be served over HTTPS. Catalogs MAY support additional protocols (IPFS, gemini, etc.) but HTTPS is mandatory.

### 12. Catalog Discovery Endpoints

In addition to the catalog manifest at `<catalog-domain>/catalog.toml`, catalogs MUST expose:

- **`<catalog-domain>/<class>/index.toml`** — A list of all atoms in the class with their current versions and narrowing labels. Used for catalog browsing and search indexing.
- **`<catalog-domain>/keys.toml`** — The signing keys recognized as valid for this catalog, along with their roles (root, class-maintainer, contributor).

Catalogs MAY expose additional discovery endpoints (search APIs, RSS feeds for new atoms, etc.) but the above MUST be present.

### 13. Catalog Self-Reference

A catalog's manifest, class indices, and signing keys are themselves atoms (of types `atoms.convergent-systems.co/catalog-manifest`, `atoms.convergent-systems.co/class-index`, `atoms.convergent-systems.co/key-record`). They MUST be signed and versioned like any other atom.

---

## Part III: References

### 14. The Reference Format

When one atom refers to another, the reference takes the canonical form:

```
<catalog-id>/<class>/<slug>@<version>
```

Where `<catalog-id>` is the canonical name of the catalog (matching its catalog manifest's `canonical_name` field), `<class>` is the class within that catalog, `<slug>` is the atom's slug, and `<version>` is the specific version being referenced.

Examples:
- `brand-atoms/palettes/nord@2.1.0`
- `theme-atoms/themes/nord-powerline@1.0.0`
- `policy-atoms/policies/citation-required@1.0.0`
- `schema-atoms/structural/profile-schema@1.0.0`

References MUST include a version. Unpinned references (without a version) are not valid in atom bodies — they make atoms non-reproducible and break cache stability.

### 15. Reference Resolution

A consumer resolving a reference performs the following steps:

1. Parse the reference into `(catalog-id, class, slug, version)`.
2. Look up the catalog-id in the catalog-of-catalogs (`atoms.convergent-systems.co/catalogs/<catalog-id>.toml`) to get the catalog's canonical domain.
3. Construct the atom URL: `<catalog-domain>/<class>/<slug>@<version>.toml`.
4. Fetch the atom. Verify its signatures against the catalog's recognized keys. Validate its body against the class's structural schema.
5. If verification fails, treat the reference as unresolvable.

The catalog-of-catalogs lookup MAY be cached locally by consumers; catalog domain mappings change rarely and SHOULD be treated as long-lived.

### 16. Dependency Declaration

An atom MAY declare its dependencies in the `dependencies` field of its identity fields. Dependencies are references in the canonical form (§14).

Dependencies serve two purposes:

- **Validation:** A consumer of the atom can verify that all dependencies resolve before using the atom.
- **Pre-fetch:** Tools can pre-fetch all dependencies along with the atom to enable offline use.

Dependencies are transitively walkable. The dependency graph MUST be acyclic except where explicitly bootstrapped (see §40).

### 17. Cross-Catalog References

References across catalogs work identically to references within a catalog. There is no special syntax. A profile-atom referencing a policy-atom uses the same reference format as a brand-atom referencing a font-atom from `theme-atoms`.

Cross-catalog trust is determined by the consumer's trust configuration, not by the catalogs themselves. A consumer MAY trust some catalogs more than others; trust requirements (§19) are declared at the consumer level.

---

## Part IV: Trust

### 18. The Signing Model

Every atom MUST be signed by at least one Ed25519 key. The author's signature is required; additional co-signatures are optional.

Signatures are computed over the canonical hash of the atom body (§6). Signatures are stored in the atom's `signatures` field as base64-encoded values keyed by signing key identifier.

A signing key is identified by `ed25519:<fingerprint>` where the fingerprint is the base64-encoded SHA-256 of the key's public material.

### 19. Trust Requirements

Consumers of atoms declare what signatures they require for an atom to be considered trustworthy. Trust requirements are typically declared at the catalog level (e.g., "all atoms in `policy-atoms` must be signed by a key in `policy-atoms`'s recognized-signers list") or at the consumer level (e.g., a profile-atom declares trust requirements for its referenced atoms).

A trust requirement MAY specify:

- Must be signed by a specific key
- Must be signed by any key from a specified set
- Must carry signatures from at least N keys from a specified set
- Must be signed by a key in a recognized signing role (root, class-maintainer, etc.)

Trust verification happens at fetch time. An atom that fails its trust requirements MUST be treated as invalid.

### 20. The Catalog Key Registry

Every catalog MUST maintain a key registry at `<catalog-domain>/keys.toml`. The registry lists:

- The keys recognized as valid signers for this catalog
- The role of each key (root, class-maintainer, contributor)
- The classes each key is authorized to sign for (if class-scoped)
- The status of each key (active, deprecated, revoked)

The key registry is itself a signed atom; it MUST be signed by the catalog's root key.

### 21. The Trust Roots

Some signing keys are recognized as trust roots — keys whose authority is acknowledged across the entire ecosystem. Trust roots are listed in the catalog-of-catalogs at `atoms.convergent-systems.co/keys/`.

Trust roots include:
- The `atoms.convergent-systems.co` root key (signs the Spec itself)
- Catalog root keys for catalogs that have applied for and received root status
- Compliance-authority keys (organizations that sign compliance-related atoms)

Trust roots MAY be added over time via the governance process (§43). Trust root revocation is exceptionally consequential and is reserved for cases of demonstrated compromise or malfeasance.

### 22. Revocation

An atom MAY be revoked by its catalog. Revocation marks the atom as no longer trustworthy and instructs consumers to stop using it. Revocation does NOT delete the atom — the atom remains fetchable for historical reference — but it adds a revocation flag to the atom's record in the catalog.

Catalogs MUST publish a revocation log at `<catalog-domain>/revocations.toml`. Consumers SHOULD check the revocation log when fetching atoms; cached atoms SHOULD have their revocation status periodically refreshed.

A revoked atom that is referenced by other atoms creates a cascade — references to a revoked atom become unresolvable. Catalogs SHOULD provide upgrade paths (a successor atom version) when revoking widely-used atoms.

---

## Part V: Lifecycle

### 23. Authoring

Atoms are authored using a builder. The builder is the construction surface that ensures atoms conform to the Spec before they are signed and published.

Every catalog SHOULD provide a builder appropriate to its content. The builder may be a CLI tool, a library, a web UI, or a combination. The builder MUST validate against the appropriate structural schema before signing.

The builder MUST refuse to sign an atom that fails validation. The builder MUST present clear errors identifying which field or constraint failed.

### 24. Publication

Publication is the process of submitting a constructed atom to a catalog for inclusion. The publication process is catalog-specific but typically involves:

1. The author submits the atom via a pull request to the catalog's source repository.
2. Automated validation verifies the atom conforms to the Spec and to the class's structural schema.
3. Human review (if required by the catalog's governance) examines the atom for quality, appropriateness, and adherence to the catalog's standards.
4. On acceptance, the catalog's signing key co-signs the atom and publishes it at its canonical URL.
5. The atom is added to the class index and becomes discoverable.

The catalog manifest declares the publication process for each class. Some classes may accept automated contributions; others may require multiple human approvers.

### 25. Versioning

Versions follow SemVer 2.0.0. Three classes of change apply to atoms:

**Compatible changes** (minor or patch version bump):
- Adding optional body fields
- Adding narrowing labels (when permitted by the label vocabulary)
- Improving descriptions or metadata
- Bug fixes that don't change behavior consumers depend on

**Soft-breaking changes** (major version bump, deprecation window):
- Deprecating optional fields
- Tightening constraints in ways most users still satisfy
- Renaming with alias support

**Hard-breaking changes** (major version bump, explicit migration):
- Removing required body fields
- Restructuring the body incompatibly
- Removing narrowing label values that other atoms reference

Hard-breaking changes require a migration capability to be published alongside, plus a minimum 12-month notice period before the old version is revoked.

### 26. Distribution and Caching

Catalogs SHOULD serve atoms via CDN. Atom URLs MUST be cacheable; the immutability of versioned atoms (§2) makes them safe to cache indefinitely.

Consumers SHOULD cache fetched atoms locally to reduce network dependence. Cache invalidation for versioned URLs is unnecessary; only latest-version URLs (without a version suffix) require cache invalidation when new versions are published.

Catalogs SHOULD set appropriate HTTP cache headers: long max-age (e.g., 1 year) for versioned URLs, short or zero max-age for latest-version URLs.

---

## Part VI: Converters

### 27. The Converter Pattern

A converter transforms a canonical TOML atom (or a set of related atoms) into a non-TOML output format consumed by a specific tool or ecosystem. The canonical atom remains the source of truth; the converted form is a derivative.

A converter declares:
- Its input atom type (catalog and class)
- Its output format name and version (e.g., `w3c-design-tokens@1.0`, `tailwind-config@3.0`, `vimrc@1.0`)
- Whether it is one-way or bidirectional
- Its implementation (a reference to a library, a script, or a service)
- Its versioning

Converters are themselves atoms in the `converter-atoms` catalog (a future catalog at `converter-atoms.com`).

### 28. Standard Output Formats

The ecosystem encourages convergence on widely-used output formats so that consumers don't need bespoke converters for every catalog. Examples of standard formats:

- **W3C Design Tokens** — for color, typography, spacing, and other design primitives
- **CSS Variables** — for browser-consumable styling
- **Tailwind Configuration** — for Tailwind-based projects
- **JSON Schema** — for schema-driven validation in non-TOML consumers
- **Open Policy Agent (OPA) Rego** — for policy engines
- **Markdown** — for human-readable rendering of structured atoms
- **TOML** (identity converter) — used when the consumer wants the canonical form

Format names are registered in the converter registry at `atoms.convergent-systems.co/converters/formats/`. New formats MAY be registered subject to governance (§43).

### 29. Bidirectional Converters

Some converters are bidirectional — they can read non-TOML input back into canonical atom form. A W3C-Design-Tokens-to-brand-atoms-palette converter would allow design tools that natively speak W3C tokens to round-trip their data into the brand-atoms catalog.

Bidirectional converters MUST round-trip with semantic equivalence: converting TOML → external → TOML MUST produce an atom semantically identical to the original (allowing for normalized formatting differences).

Bidirectional support is OPTIONAL per converter. Most converters will be one-way (TOML → consumer format).

### 30. The Converter Registry

The catalog-of-catalogs hosts a converter registry at `atoms.convergent-systems.co/converters/`. The registry lists:

- All registered converters by input atom type
- All registered output format names
- Implementation references for each converter
- Versioning and maintenance status

Consumers query the registry to discover which converters exist for a given atom type or output format. The registry is itself organized by class — see Part VII for the catalog-of-catalogs structure.

---

## Part VII: The Catalog of Catalogs

### 31. Purpose

`atoms.convergent-systems.co` is the entry point to the ecosystem. It serves four roles:

1. **Authority on the Spec.** Hosts the canonical Spec document at versioned URLs. The Spec itself is an atom.
2. **Registry of catalogs.** Lists every recognized atom catalog with its canonical URL and metadata.
3. **Trust root authority.** Lists recognized signing keys with elevated trust status across the ecosystem.
4. **Converter registry.** Lists available converters and registered output formats.

`atoms.convergent-systems.co` is itself an atom catalog. It conforms to the Spec. Its atoms are subject to the same signing, versioning, and reference rules as any other catalog. The recursion bottoms out at the bootstrap rules in Part IX.

### 32. Catalog Structure

`atoms.convergent-systems.co` has the following classes:

**`spec`** — Versions of the Atom Spec. Each version of the Spec is an atom at `atoms.convergent-systems.co/spec/atom-spec@<version>.toml`. The current canonical Spec is published as `atoms.convergent-systems.co/spec/atom-spec.toml` (no version suffix).

**`catalogs`** — Registry entries for recognized catalogs. Each entry is an atom at `atoms.convergent-systems.co/catalogs/<catalog-id>.toml`. The entry includes the catalog's canonical domain, current Spec version implemented, class list, maintainer contact, status (active / deprecated / archived).

**`keys`** — Trust root signing keys. Each entry is an atom at `atoms.convergent-systems.co/keys/<key-id>.toml`. The entry includes the public key material, the holder's identity, the granted authority (which catalogs the key is authoritative for), the issuance date, and the revocation status.

**`converters`** — Converter declarations. Each entry is an atom at `atoms.convergent-systems.co/converters/<converter-id>.toml`. The entry includes input/output specifications, implementation reference, and versioning.

**`formats`** — Registered output formats for converters. Each entry is an atom at `atoms.convergent-systems.co/converters/formats/<format-id>.toml`. The entry includes the format name, version, specification reference, and registration status.

**`governance`** — Governance records for the Spec and the ecosystem. Includes amendment proposals, ratified amendments, and governance decisions. Each entry is an atom at `atoms.convergent-systems.co/governance/<record-id>.toml`.

### 33. The Catalog Registry

A new catalog enters the ecosystem by being added to `atoms.convergent-systems.co/catalogs/`. The submission process:

1. The catalog maintainer submits a catalog manifest as a PR against the `atoms.convergent-systems.co` source repository.
2. Automated validation verifies the catalog's manifest conforms to the catalog-manifest schema, the catalog's URL is reachable, and the catalog's keys.toml is signed correctly.
3. Human review evaluates the catalog's purpose, governance, and overall fitness for the ecosystem.
4. On acceptance, the catalog is added to the registry. Its canonical_name is reserved.

Catalogs MUST remain in compliance with the Spec to remain in the registry. Catalogs that fall out of compliance (e.g., abandon their URLs, stop signing atoms, drift from the URL convention) MAY be flagged or removed via the governance process.

### 34. The Trust Root Registry

Signing keys with elevated trust status are listed at `atoms.convergent-systems.co/keys/`. Status categories:

- **Root** — The `atoms.convergent-systems.co` root key itself. Signs the Spec. There is exactly one root key at any given time; rotation is exceptional and governed by Part X.
- **Catalog-root** — A catalog's root signing key, recognized as authoritative for that catalog. Adding a catalog-root key to the trust root registry is part of the catalog admission process (§33).
- **Compliance-authority** — Keys held by organizations that author and sign compliance-related atoms (regulatory bodies, accredited auditors, etc.).
- **Community-trusted** — Keys held by recognized community members whose signatures carry elevated weight for community-contributed atoms.

Adding a key to the trust root registry is a governance action (§43). Revocation is exceptional and requires demonstrated cause.

### 35. The Spec Itself

The canonical Spec is published at `atoms.convergent-systems.co/spec/atom-spec.toml` (latest version) and `atoms.convergent-systems.co/spec/atom-spec@<version>.toml` (specific versions).

The Spec is signed by the `atoms.convergent-systems.co` root key. Catalogs reference the Spec version they implement in their catalog manifest. Consumers MAY require atoms to conform to a minimum Spec version.

The Spec document is the source of truth for ecosystem behavior. Disputes about what is or is not conformant are resolved by reference to the current Spec.

### 36. Discovery Workflow

A consumer entering the ecosystem follows this discovery path:

1. Fetch `atoms.convergent-systems.co/catalogs/index.toml` to see what catalogs exist.
2. Select a catalog of interest; fetch its catalog manifest at `<catalog-domain>/catalog.toml`.
3. Review the catalog's classes; fetch the class index at `<catalog-domain>/<class>/index.toml`.
4. Browse atoms in the class; fetch individual atoms by their canonical URLs.
5. If converted output is needed, query `atoms.convergent-systems.co/converters/` for converters matching the desired output format.

This workflow uses only HTTP GET on documented URL patterns. No vendor APIs are required. No keys or authentication are required for read access (write access — i.e., publication — has separate requirements per catalog).

### 37. Search Across the Ecosystem

`atoms.convergent-systems.co` SHOULD provide an ecosystem-wide search interface that indexes atoms across all registered catalogs. The search MAY be:

- Faceted by catalog, class, and narrowing label
- Full-text across atom descriptions and metadata
- Filtered by signing key, version, and other identity fields

Catalogs MUST expose their class indices in a form amenable to ingestion by the ecosystem search. The exact ingestion protocol is implementation-defined but SHOULD be incremental (catalogs publish a feed of changes that the search service consumes).

The ecosystem search is a convenience, not a normative part of the Spec. Consumers MAY operate without using it, accessing atoms directly via their canonical URLs.

---

## Part VIII: The Builder Contract

### 38. Builder Responsibilities

Every catalog SHOULD provide a builder for constructing atoms in its classes. Every builder MUST satisfy the following contract:

**Schema validation.** The builder MUST validate every constructed atom against the structural schema for its class before allowing it to be signed.

**Reference resolution.** The builder MUST resolve all references in the atom's body and dependencies. References that don't resolve MUST cause the builder to refuse construction.

**Narrowing label validation.** The builder MUST validate that narrowing labels conform to the class's label vocabulary. Unknown label names or out-of-vocabulary values MUST cause the builder to refuse construction.

**Signing.** The builder MUST sign constructed atoms with the authoring key. The signature MUST be computed over the canonical hash (§6).

**Canonical serialization.** The builder MUST produce output in canonical TOML form (sorted keys, normalized whitespace, etc.) so that the hash is stable.

**Spec version declaration.** The builder MUST stamp the `spec_version` field with the Spec version it conforms to.

**Error transparency.** When refusing construction, the builder MUST identify which field or constraint failed and why.

### 39. Builder Forms

Builders MAY take any of the following forms:

- **CLI tool.** Constructs atoms from command-line arguments or input files. Suitable for scripting and CI.
- **Library.** Programmatic API in Go, Python, Rust, JavaScript, or other languages. Suitable for embedding in larger applications.
- **Web UI.** Interactive interface for browsing existing atoms and composing new ones. Suitable for non-technical contributors.
- **API endpoint.** HTTP API that accepts atom-construction requests and returns signed atoms. Suitable for tool integrations.

A catalog MAY provide multiple builder forms. The `brand-atoms` catalog, for example, exposes both a web builder and a programmatic builder for atom construction. All builders for the same catalog MUST produce semantically identical atoms from the same input — the form differs, the output does not.

---

## Part IX: Bootstrap and Self-Reference

### 40. The Bootstrap Atom

The Spec validates atoms. The Spec is itself an atom. The Spec validates itself.

This circularity is resolved by the bootstrap rule: **the Spec version `1.0.0` is the bootstrap version**. It is hand-authored, signed by the `atoms.convergent-systems.co` root key, and accepted as authoritative by convention. Its validity is not derived from a higher-level rule; it is established by the ecosystem's foundational consensus.

All subsequent atoms — including subsequent versions of the Spec itself — validate against the Spec version they declare conformance to. The Spec validates other atoms by being read by their builders; the Spec validates new versions of itself by being read by the human review process during governance (§43).

### 41. Schema-Atoms vs. The Spec

The Spec and the `schema-atoms` catalog are complementary but distinct:

- **The Spec** defines what every atom and every catalog MUST be — universal identity, URL convention, signing, versioning, references, trust. Lives at `atoms.convergent-systems.co/spec/`.
- **The `schema-atoms` catalog** hosts the structural schemas for individual atom classes — what a profile-atom's body looks like, what a policy-atom's body looks like, etc. Lives at its own canonical domain (`schema-atoms.com`).

`schema-atoms` is a normal catalog that conforms to the Spec. It has classes (structural, vocabularies, grammars, types — see the schema-atoms design document). It signs its atoms. It follows the URL convention. The Spec governs `schema-atoms` the same way it governs every other catalog.

The Spec governs *structure*; schema-atoms governs *content*. An atom's universal identity fields (canonical_name, version, signatures, etc.) are validated against the Spec. The atom's body is validated against the structural schema in schema-atoms for the atom's class.

### 42. The Recursion

`atoms.convergent-systems.co` is itself an atom catalog. Its catalog manifest is at `atoms.convergent-systems.co/catalog.toml`. Its classes (spec, catalogs, keys, converters, formats, governance) are declared in the manifest. Each class has a structural schema in `schema-atoms`.

The recursion bottoms out at:
- The Spec v1.0.0, hand-authored and signed by the root key
- The `schema-atoms/structural/catalog-manifest-schema@1.0.0`, hand-authored
- The `atoms.convergent-systems.co` root key, generated and held by the ecosystem founders

These three artifacts are the bedrock. Every other artifact in the ecosystem derives its validity from them.

---

## Part X: Governance of the Spec

### 43. Amendment Process

Changes to the Spec follow a formal amendment process. The process recognizes three types of amendments:

**Compatible amendments** (Spec patch or minor version bump):
- Clarifications of existing rules without changing behavior
- Optional new features that don't break existing conformance
- Addition of new sections to address ecosystem growth

Compatible amendments require:
- A proposal published as an atom at `atoms.convergent-systems.co/governance/proposals/`
- A 30-day public comment period
- Approval by the Spec maintainers
- Publication of the new Spec version

**Soft-breaking amendments** (Spec major version bump, with deprecation):
- Tightening existing rules in ways most catalogs already satisfy
- Deprecating optional features with continued support during transition

Soft-breaking amendments require:
- A proposal with explicit deprecation path
- A 90-day public comment period
- Approval by the Spec maintainers
- A minimum 12-month deprecation window for catalogs to migrate

**Hard-breaking amendments** (Spec major version bump, with migration requirement):
- Removing required behaviors that catalogs depend on
- Changing universal field structures or naming
- Changing the URL convention or signing format

Hard-breaking amendments require:
- A proposal with explicit migration tooling commitment
- A 180-day public comment period
- Approval by the Spec maintainers
- A minimum 24-month migration window for catalogs to migrate
- Publication of migration capabilities for affected catalogs

### 44. Spec Maintainership

The Spec is maintained by a small group with authority delegated from the root key holder. The current Spec maintainership and its members are listed at `atoms.convergent-systems.co/governance/maintainers.toml`.

Maintainership changes (additions, removals) follow the same amendment process as the Spec itself.

### 45. Catalog Conformance

Catalogs declare which version of the Spec they conform to in their catalog manifest. A catalog MAY conform to multiple Spec versions simultaneously (during transition periods); the manifest declares the supported range.

A catalog that no longer conforms to its declared Spec version is in violation. Violations are noted in the catalog registry at `atoms.convergent-systems.co/catalogs/<catalog-id>.toml` with status `non-conformant`. Catalogs MAY be removed from the registry for sustained non-conformance via the governance process.

### 46. Ecosystem Disputes

Disputes between catalogs, between authors, or between catalogs and the Spec are resolved by reference to the current Spec. Where the Spec is silent or ambiguous, the dispute is escalated to the Spec maintainership for clarification, which MAY produce a Spec amendment if the ambiguity is structural.

---

## Part XI: Open Questions

These items are deliberately left for resolution by implementation experience or future Spec amendment.

### 47. Spec Localization

Whether the Spec is published in multiple human languages, and what authority translations carry. Recommendation: the canonical Spec is in English; translations are best-effort and non-normative until a localization process is formalized.

### 48. Atom Provenance Beyond Signing

Whether atoms should carry richer provenance (build environment, source repository state, automated build attestations) beyond a simple signature. The SLSA framework and similar provenance standards may be incorporated in future Spec versions.

### 49. Federation Between Ecosystem Instances

Whether multiple instances of "the ecosystem" can federate — a private deployment with its own `atoms.example.com` catalog-of-catalogs that bridges to the public `atoms.convergent-systems.co`. Recommendation: federation is supported by convention (catalog references work across instances using full URLs) but no formal federation protocol exists in v1.0.0.

### 50. Privacy of Personal Atoms

Personal atoms (a user's private knowledge sources, personal policies, etc.) MUST NOT appear in public catalogs but MAY be referenced by atoms that do. The trust requirements for personal atoms are user-local. The Spec is silent on personal-atom distribution mechanisms; users may use any storage they trust.

### 51. Atom Discoverability Across Versions

When a consumer fetches `<atom>@latest`, they want the current canonical version. But what about "latest stable" vs "latest including pre-release"? Recommendation: catalogs MAY support version selectors (`@latest`, `@latest-stable`, `@1.x`, etc.); the Spec mandates only `@<exact-version>` and the unsuffixed (latest) URL.

### 52. Long-Term Archival

What happens to a catalog whose maintainers disappear? The atoms remain at their URLs as long as the domain is paid for, but eventually the URLs may go dark. Recommendation: `atoms.convergent-systems.co` MAY operate an archival mirror of registered catalogs to preserve the ecosystem against link rot. Implementation details deferred.

### 53. Right to Be Forgotten

When an atom author requests their atoms be removed (GDPR-style), but those atoms are referenced by other atoms in the catalog — what happens? The author's request and the catalog's dependency graph may conflict. Recommendation: the catalog's governance binding declares its policy on this; the Spec does not mandate a specific resolution.

### 54. Atom Internationalization

Atoms with human-readable content (descriptions, comments, knowledge atoms) currently assume a single language. Multi-language atoms — where the same atom carries content in several languages — are not addressed in v1.0.0. Recommendation: defer to future Spec amendment after empirical demand emerges.

---

## Summary

The Atom Spec is the constitution of the `*-atoms` ecosystem. Every atom catalog conforms to it. Every atom carries the universal identity fields, lives at a canonical URL, is signed by Ed25519 keys, is versioned with semver, and is serialized in canonical TOML.

Catalogs organize atoms into classes. Classes have structural schemas (in `schema-atoms`), narrowing label vocabularies, and dedicated URL paths. The catalog manifest at `<catalog-domain>/catalog.toml` is the catalog's self-description.

References between atoms use the form `<catalog-id>/<class>/<slug>@<version>`. References across catalogs work identically to references within a catalog. Resolution proceeds through the catalog-of-catalogs at `atoms.convergent-systems.co`.

`atoms.convergent-systems.co` hosts the Spec, the catalog registry, the trust root registry, and the converter registry. It is itself a catalog conforming to the Spec, with classes for spec versions, catalogs, keys, converters, formats, and governance records.

Converters transform canonical TOML atoms into consumer-specific output formats (W3C Design Tokens, CSS variables, Tailwind config, Rego, etc.). Converters are themselves atoms; the converter registry is at `atoms.convergent-systems.co/converters/`.

The Spec evolves through a formal amendment process with three change classes (compatible, soft-breaking, hard-breaking) and corresponding governance requirements (comment periods, deprecation windows, migration commitments).

This Spec, v1.0.0, is the bootstrap version. It is hand-authored, signed by the `atoms.convergent-systems.co` root key, and serves as the foundational artifact against which all subsequent atoms — including subsequent versions of the Spec itself — are validated.

The Spec is published at `atoms.convergent-systems.co/spec/atom-spec@1.0.0.toml` (or equivalent canonical form). All atom catalogs that conform to this Spec MAY declare conformance in their catalog manifest.
