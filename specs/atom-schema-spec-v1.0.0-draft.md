# Atom Schema Spec — 1.0.0-draft

**Atom ID:** `schema-atoms/design-spec/atom-schema-spec@1.0.0-draft`
**Status:** 1.0.0-draft · lifecycle: draft · Phase 1 bootstrap
**Conforms to:** Atom Spec v1.1.0
**Steward:** convergent-systems-co
**Federation:** convergent-systems.co
**License:** Apache-2.0 (spec prose) · CC-BY-4.0 (atom content)

---

## Summary

The Atom Schema Spec defines `schema-atoms.com` — the canonical registry for all
specifications, schemas, and machine-readable contracts in the Convergent Systems
ecosystem. It defines the type taxonomy (the set of atom classes the catalog holds),
the TOML shape for each class, URL routing, quorum rules, provenance requirements
for imported standards, and the publication workflow.

This spec is itself a `design-spec` atom in schema-atoms, making the catalog
self-referential at one remove: the spec that defines what schema-atoms holds is
itself held in schema-atoms. This mirrors the Atom Spec's own self-reference
(`schema-atoms/design-spec/atom-spec@1.1.0`).

---

## Part I — What schema-atoms.com is

`schema-atoms.com` is the registry of **normative artifacts** — anything that
specifies the shape, structure, contract, or rules of something else.

The unifying property of every atom in schema-atoms: **something else conforms to it.**
A JSON Schema is conformed to by data. An OpenAPI spec is conformed to by an API
implementation. An RFC is conformed to by a protocol implementation. A design spec
is conformed to by a system being built. A grammar is conformed to by a language
implementation.

What schema-atoms is **not**: a registry of documentation, tutorials, explanations,
or narrative. Those live in `doc-atoms.com`. The distinction is normative vs.
explanatory. A blog post explaining the Atom Spec is a doc. The Atom Spec itself
is a design-spec in schema-atoms. A guide to writing JSON Schemas is a doc. A
JSON Schema validating panel configuration is a data-schema in schema-atoms.

### Relationship to other catalogs

- `doc-atoms.com` — explanatory content (narrates, teaches, describes)
- `schema-atoms.com` — normative content (specifies, contracts, constrains)
- Other catalogs — content *described by* schemas in schema-atoms (persona-atoms
  holds personas whose shape is defined by a json-schema atom in schema-atoms)

The JSON Schemas currently living in `governance/schemas/` in the AI Constitution
repository will migrate to schema-atoms as `json-schema` atoms. The design specs
for each catalog (Atom Persona Spec, Atom Policy Spec, etc.) live here as
`design-spec` atoms. The Atom Spec itself lives here.

---

## Part II — Type taxonomy

schema-atoms holds atoms of the following classes. Each class is a distinct
URL path segment and a distinct entry in ATOMS.yml's `atom_types` list.

Classes are organized into six type families for conceptual clarity, but the
families are not encoded in the atom structure — only the class matters at runtime.

### Family 1 — design-spec

**Class:** `design-spec`

Normative specifications of systems, methodologies, protocols, or practices to
be built or followed. Prose-with-structure. Versioned. Subject to amendment.
Referenced by implementations that must conform to them.

Examples:
- The Atom Spec (`schema-atoms/design-spec/atom-spec@1.1.0`)
- This spec (`schema-atoms/design-spec/atom-schema-spec@1.0.0-draft`)
- The AI Constitution Spec (`schema-atoms/design-spec/ai-constitution-spec@1.0.0-draft`)
- The Olympus Spec (`schema-atoms/design-spec/olympus-spec@1.0.0-draft`)
- Per-catalog specs (`schema-atoms/design-spec/atom-persona-spec@1.0.0-draft`, etc.)
- The Atom Key Spec, Atom Cache Spec, Atom CLI Spec

Every per-catalog spec is a `design-spec` atom in schema-atoms. This means
schema-atoms is the single source of truth for all normative Convergent Systems
specifications, regardless of which catalog they describe.

Distinction from `protocol-spec`: design-specs describe *what to build*.
Protocol-specs describe *how to communicate* (typically imported from standards
bodies). Both are normative; the distinction is authorship and purpose.

### Family 2 — api-spec

Machine-readable specifications of programmatic interfaces. The payload is the
canonical API contract file. Consuming tools (code generators, validators, mocking
frameworks) operate directly on the asset.

| Class | Covers | Asset format |
|---|---|---|
| `openapi-spec` | REST/HTTP APIs (OpenAPI 3.x) | `.yaml` or `.json` |
| `asyncapi-spec` | Event-driven APIs (AsyncAPI 2.x/3.x) | `.yaml` or `.json` |
| `graphql-schema` | GraphQL APIs | `.graphql` or `.sdl` |
| `grpc-spec` | gRPC services (Protobuf service definitions) | `.proto` |
| `json-rpc-spec` | JSON-RPC 2.0 method specifications | `.yaml` or `.json` |

Examples:
- `schema-atoms/openapi-spec/atom-registry-api@1.0.0` — REST API for the atoms registry
- `schema-atoms/grpc-spec/olympus-agent-protocol@1.0.0` — Olympus internal gRPC protocol

### Family 3 — data-schema

Machine-validatable specifications of data shape. The payload is a schema file
that validators consume to check conformance of data instances.

| Class | Covers | Asset format |
|---|---|---|
| `json-schema` | JSON/YAML data (JSON Schema 2020-12 or earlier) | `.json` |
| `protobuf-schema` | Protobuf message definitions (no service) | `.proto` |
| `avro-schema` | Apache Avro data schemas | `.avsc` or `.json` |
| `xml-schema` | XML document shape (XSD) | `.xsd` |
| `toml-schema` | TOML document shape (emerging standard) | `.toml` |

Examples:
- `schema-atoms/json-schema/panels-config@1.0.0` — the panels.schema.json file
- `schema-atoms/json-schema/project-config@1.0.0` — the project.schema.json file
- `schema-atoms/json-schema/agent-envelope@1.0.0` — the agent-envelope.schema.json file

This is where the 30+ JSON Schemas currently in `governance/schemas/` will migrate.
Each becomes an independent, versioned, signed atom. Consumers reference them by
content_hash so registry compromise does not affect existing validated data.

### Family 4 — protocol-spec

Prose specifications of communication protocols, primarily imported from external
standards bodies. The payload is the canonical spec text. Atoms reference the
upstream authoritative source.

| Class | Covers | Primary source |
|---|---|---|
| `rfc` | IETF RFCs | rfc-editor.org |
| `w3c-spec` | W3C standards and recommendations | w3.org |
| `iso-spec` | ISO international standards | iso.org |
| `fips` | NIST FIPS publications | csrc.nist.gov |
| `internal-protocol` | Internal Convergent Systems protocols | convergent-systems.co |

Examples:
- `schema-atoms/fips/fips-204@1.0.0` — ML-DSA (the signing algorithm baseline)
- `schema-atoms/rfc/rfc-3339@1.0.0` — Date/time format used in atom timestamps
- `schema-atoms/rfc/rfc-7517@1.0.0` — JSON Web Key (reference for key atoms)

Provenance is mandatory for imported protocol-specs. See Part V.

### Family 5 — language-spec

Formal specifications of languages — programming languages, query languages,
grammar formalisms. The payload is the grammar definition or language reference.

| Class | Covers | Asset format |
|---|---|---|
| `bnf-grammar` | BNF grammars | `.bnf` or `.txt` |
| `ebnf-grammar` | EBNF grammars | `.ebnf` or `.txt` |
| `language-reference` | Programming language specifications | `.md` or `.html` |
| `query-language-spec` | SQL dialects, JSONPath, CEL, CQL, JMESPath | `.md` or `.yaml` |
| `regex-spec` | Regular expression flavor specifications | `.md` |

Examples:
- `schema-atoms/query-language-spec/cql-confluence@1.0.0` — CQL grammar used by Confluence search
- `schema-atoms/ebnf-grammar/toml-1-0@1.0.0` — TOML 1.0 grammar (referenced by Atom Spec)

### Family 6 — taxonomy-spec

Specifications of classification systems, controlled vocabularies, and code lists.
The payload is the authoritative enumeration of valid values with definitions.

| Class | Covers | Asset format |
|---|---|---|
| `ontology` | OWL/RDF ontologies, formal concept systems | `.ttl`, `.owl`, or `.json-ld` |
| `controlled-vocabulary` | Enumerated value sets with definitions | `.yaml` or `.json` |
| `code-list` | Authority files (country codes, currency codes, etc.) | `.json` or `.csv` |

Examples:
- `schema-atoms/controlled-vocabulary/atom-lifecycle-states@1.0.0` — the draft/published/adopted/historic enum
- `schema-atoms/controlled-vocabulary/signer-roles@1.0.0` — root/editor/catalog-maintainer/ratifier/mirror-operator
- `schema-atoms/controlled-vocabulary/persona-domains@1.0.0` — engineering/security/architecture/data/documentation/finops
- `schema-atoms/code-list/iso-3166-1@2024` — ISO country codes (if referenced by identity-atoms)

---

## Part III — Universal atom envelope

Every atom in schema-atoms carries the standard envelope from Atom Spec v1.1.0.
This section documents the envelope fields as they apply to schema-atoms atoms.
The authoritative definition is in the Atom Spec.

```toml
# === REQUIRED ENVELOPE (all atoms, all catalogs) ===
id          = "schema-atoms/<class>/<slug>"     # e.g. schema-atoms/json-schema/panels-config
version     = "1.0.0"                           # SemVer. Immutable once published.
content_hash = "sha256:<64-hex-chars>"          # SHA-256 of canonical TOML body (no [signatures])
lifecycle   = "draft"                           # draft | published | adopted | historic
created_at  = "2026-05-23T00:00:00Z"            # RFC 3339

# === OPTIONAL LINEAGE ===
supersedes     = ""    # atom reference: "schema-atoms/<class>/<slug>@<version>"
superseded_by  = ""    # set retroactively on the old atom when replaced
migration_notes = ""   # free-text paper trail

# === SIGNATURES (required, see Atom Spec Part IV) ===
[[signatures]]
algorithm   = "ml-dsa-65"
signer_role = "catalog-maintainer"    # or "editor" for design-spec atoms
signer_key_id = "k_cs_schema_2026"
signature   = "<base64>"
signed_at   = "2026-05-23T00:00:00Z"
covers      = "content_hash"
```

---

## Part IV — Type-specific TOML payload sections

Each atom class adds a typed payload section below the envelope. The section name
is the family name, not the class name. Classes within the same family share a
section name with a `class` discriminator field.

### design-spec payload

```toml
[spec]
class       = "design-spec"
title       = "Human-readable title of this spec"
summary     = "One-sentence summary. Used in the catalog index."
authors     = ["convergent-systems-co"]
conforms_to = ""    # atom reference to the spec this spec conforms to
                    # e.g. "schema-atoms/design-spec/atom-spec@1.1.0"
asset       = "spec.md"    # relative path to the spec document in the atom bundle

# Optional: amendment log
[[spec.amendments]]
version     = "1.1.0"
date        = "2026-06-01"
summary     = "Added section on private deployments"
atom_ref    = "amendment-atoms/amendment/atom-schema-spec-001@1.0.0"
```

### api-spec payload

```toml
[api]
class         = "openapi-spec"    # openapi-spec | asyncapi-spec | graphql-schema | grpc-spec | json-rpc-spec
title         = "API name"
summary       = "What this API does"
api_version   = "3.1.0"          # the spec format version (OpenAPI 3.1.0, AsyncAPI 3.0, etc.)
asset         = "openapi.yaml"
base_urls     = ["https://api.example.com/v1"]
stability     = "stable"          # draft | alpha | beta | stable | deprecated
```

### data-schema payload

```toml
[schema]
class               = "json-schema"    # json-schema | protobuf-schema | avro-schema | xml-schema | toml-schema
title               = "Schema name"
summary             = "What data this schema validates"
schema_version      = "2020-12"        # JSON Schema draft version, Avro version, etc.
asset               = "schema.json"
validates           = ""               # free-text: what kind of data (e.g. "panel configuration files")
# For json-schema, the $id in the schema SHOULD match the atom id:
# "$id": "https://schema-atoms.com/json-schema/panels-config/1.0.0/schema.json"
```

### protocol-spec payload (internal)

```toml
[protocol]
class           = "internal-protocol"
title           = "Protocol name"
summary         = "What this protocol defines"
asset           = "protocol.md"
```

### protocol-spec payload (imported — rfc, w3c-spec, iso-spec, fips)

See Part V (Provenance) for the full provenance block required on imported specs.

```toml
[protocol]
class           = "rfc"              # rfc | w3c-spec | iso-spec | fips
title           = "Timestamps in Internet Protocols"
number          = "3339"             # RFC number, W3C shortname, ISO number, FIPS number
status          = "Proposed Standard" # IETF status; W3C: Recommendation; ISO: International Standard
published       = "2002-07"          # YYYY-MM of original publication
asset           = "rfc3339.txt"

[protocol.provenance]
upstream_url    = "https://www.rfc-editor.org/rfc/rfc3339"
imported_at     = "2026-05-23T00:00:00Z"
imported_by     = "convergent-systems-co"
checksum        = "sha256:<hex>"     # SHA-256 of the upstream asset at import time
license         = "public-domain"    # or "IETF Trust", "W3C Document License", etc.
```

### language-spec payload

```toml
[language]
class       = "ebnf-grammar"    # bnf-grammar | ebnf-grammar | language-reference | query-language-spec | regex-spec
title       = "Grammar name"
summary     = "What language this grammar defines"
notation    = "ebnf"            # bnf | ebnf | peg | antlr | lark
asset       = "grammar.ebnf"
```

### taxonomy-spec payload

```toml
[taxonomy]
class       = "controlled-vocabulary"  # ontology | controlled-vocabulary | code-list
title       = "Vocabulary name"
summary     = "What this vocabulary covers"
asset       = "vocabulary.json"        # for large vocabularies
# For small vocabularies, values may be inline:
values      = []                       # array of string values (omit if using asset)
```

---

## Part V — Provenance for imported specifications

Atoms in classes `rfc`, `w3c-spec`, `iso-spec`, and `fips` MUST include a full
`[protocol.provenance]` block. Atoms in `language-reference` and `code-list` that
import from external authority files SHOULD include an equivalent `[<section>.provenance]`
block.

Provenance serves three purposes:
1. **Attribution** — identifies the original source and its license.
2. **Integrity** — the checksum confirms the imported asset matches the canonical upstream.
3. **Auditability** — the imported_at timestamp and imported_by field document when and
   by whom the import was performed, creating a verifiable paper trail.

Provenance does not confer rights beyond those granted by the upstream license.
Consumers MUST check upstream license terms before redistributing protocol-spec atoms.

### Import workflow

1. Download the upstream asset from the canonical source.
2. Compute `sha256` of the downloaded asset.
3. Create the atom TOML with the `[protocol.provenance]` block.
4. Commit asset + TOML to the schema-atoms repository.
5. Publish through the standard atom publication workflow (Part VIII).

Imported specs do NOT carry Convergent Systems signing authority for their *content*;
the Convergent Systems signature covers only the *atom envelope* (the metadata + hash).
Consumers who care about the protocol content itself should verify against the upstream.

---

## Part VI — URL routing

schema-atoms.com uses the following URL structure:

```
https://schema-atoms.com/<class>/                        # class index
https://schema-atoms.com/<class>/<slug>/                 # atom version history
https://schema-atoms.com/<class>/<slug>/<version>/       # atom landing page
https://schema-atoms.com/<class>/<slug>/<version>/atom.toml    # canonical TOML
https://schema-atoms.com/<class>/<slug>/<version>/<asset-file> # payload asset
https://schema-atoms.com/dist/<class>/<slug>/<version>/        # converter outputs
```

### Stable URLs

Once an atom reaches `lifecycle = "published"`, its versioned URL is permanent.
The catalog MUST NOT delete or replace content at a published URL. Superseded atoms
remain reachable; their `superseded_by` field tells consumers where to look next.

### Catalog-level endpoints

```
https://schema-atoms.com/                              # catalog home
https://schema-atoms.com/exports/catalog.json          # full catalog index (all atoms)
https://schema-atoms.com/exports/by-class.json         # atoms grouped by class
https://schema-atoms.com/exports/by-lifecycle.json     # atoms grouped by lifecycle
https://schema-atoms.com/mirror.toml                   # mirror declaration
```

---

## Part VII — ATOMS.yml for schema-atoms

The canonical catalog manifest. All 20 classes are declared; empty classes are
listed so tooling knows they are intentional gaps, not omissions.

```yaml
spec_version: atoms-spec/v1.1.0
name: schema-atoms
version: 1.0.0-draft
canonical_domain: schema-atoms.com
federation: convergent-systems.co

atom_types:
  # Family: design-spec
  - design-spec
  # Family: api-spec
  - openapi-spec
  - asyncapi-spec
  - graphql-schema
  - grpc-spec
  - json-rpc-spec
  # Family: data-schema
  - json-schema
  - protobuf-schema
  - avro-schema
  - xml-schema
  - toml-schema
  # Family: protocol-spec
  - rfc
  - w3c-spec
  - iso-spec
  - fips
  - internal-protocol
  # Family: language-spec
  - bnf-grammar
  - ebnf-grammar
  - language-reference
  - query-language-spec
  - regex-spec
  # Family: taxonomy-spec
  - ontology
  - controlled-vocabulary
  - code-list

composition_type: spec-compositions
composition_dir: compositions/

signing:
  required_algorithms: ["ml-dsa-65"]
  accepted_algorithms: ["ml-dsa-65", "ml-dsa-44", "ml-dsa-87"]
  quorum_rules:
    # Default: any atom requires catalog-maintainer signature
    default: "1 of role:catalog-maintainer"
    # design-spec atoms additionally require editor signature
    "design-spec": "1 of role:catalog-maintainer + 1 of role:editor"
    # governance atoms require ratifier
    "governance/*": "1 of role:catalog-maintainer + 1 of role:ratifier"
    # Protocol specs imported from standards bodies: catalog-maintainer only
    "rfc": "1 of role:catalog-maintainer"
    "w3c-spec": "1 of role:catalog-maintainer"
    "iso-spec": "1 of role:catalog-maintainer"
    "fips": "1 of role:catalog-maintainer"

lifecycle:
  current: "draft"

licensing:
  code: "Apache-2.0"
  data: "CC-BY-4.0"
  # Note: imported protocol-specs retain their upstream license.
  # The CC-BY-4.0 applies to Convergent Systems-authored atom content only.
  # The protocol.provenance block on each imported atom records the upstream license.

steward: convergent-systems-co
infrastructure_operator: convergent-systems-co

runtime_consumers:
  - ai-constitution  # AI Constitution methodology
  - olympus          # Olympus AI OS
  - atoms-tools      # Reference implementation / CLI
```

---

## Part VIII — Publishing a new spec atom

The publication workflow for a new `design-spec` atom (the most common case).
Other classes follow the same workflow; only the payload section differs.

### Step 1 — Author the spec

Write the spec document (`spec.md`). It should be a complete, normative document
in Markdown. Structure it with Parts or Sections. Include: purpose, scope,
normative requirements (MUST/SHOULD/MAY), examples, open questions, and a changelog.

### Step 2 — Create the atom TOML (draft)

```toml
id          = "schema-atoms/design-spec/<slug>"
version     = "1.0.0-draft"
content_hash = ""           # computed in step 4
lifecycle   = "draft"
created_at  = "2026-MM-DDTHH:MM:SSZ"

[spec]
class       = "design-spec"
title       = "Your Spec Title"
summary     = "One sentence."
authors     = ["convergent-systems-co"]
conforms_to = "schema-atoms/design-spec/atom-spec@1.1.0"
asset       = "spec.md"

[[signatures]]
algorithm   = "ml-dsa-65"
signer_role = "catalog-maintainer"
signer_key_id = "<key-id>"
signature   = ""            # computed in step 5
signed_at   = ""
covers      = "content_hash"
```

### Step 3 — Canonicalize

Run `atoms canonicalize <atom.toml>` to produce the canonical TOML form:
- Sort keys lexicographically within each table
- Unix line endings
- UTF-8 without BOM
- Normalized numerics
- Comments stripped

### Step 4 — Compute content_hash

```bash
atoms hash <atom.toml>    # outputs sha256:<hex>
```

Add the result to the `content_hash` field. Re-canonicalize if needed (the hash
field changes the TOML; canonical form must be produced AFTER the hash is set,
but with the `[signatures]` table absent).

The correct order: produce canonical TOML without [signatures] → hash that →
set content_hash → produce canonical TOML again without [signatures] → hash THAT
→ verify it equals the content_hash you just set. (It should, since content_hash
is already present in the canonical form that was hashed.)

### Step 5 — Sign

```bash
atoms sign <atom.toml> --key <key-atom-ref> --role catalog-maintainer
# For design-spec, also:
atoms sign <atom.toml> --key <editor-key-atom-ref> --role editor
```

Each signing command appends a `[[signatures]]` entry.

### Step 6 — Validate

```bash
atoms validate <atom.toml>    # checks envelope, hash, signatures, quorum
```

### Step 7 — Open a PR

PR against the schema-atoms repository. CI runs `atoms validate` on all changed
atoms. On merge, the atom is published to the catalog at its versioned URL.

### Step 8 — Lifecycle transitions

Draft atoms may be iterated (same version number may be updated while
`lifecycle = "draft"`). Once stable:

```bash
atoms lifecycle set <atom-ref> published
```

This republishes the atom with `lifecycle = "published"`, a new `content_hash`,
and new signatures. After this, the version is immutable.

---

## Part IX — Supersession: `spec` → `design-spec`

The Atom Spec v1.1.0 was published as `schema-atoms/spec/atom-spec@1.1.0`, using
`spec` as the class. This spec introduces `design-spec` as the canonical class name
for normative specifications. The migration:

**Step 1:** Publish Atom Spec at the new class path:

```
schema-atoms/design-spec/atom-spec@1.1.0
```

with:

```toml
supersedes = "schema-atoms/spec/atom-spec@1.1.0"
migration_notes = "Class renamed from 'spec' to 'design-spec' per the Atom Schema Spec
  v1.0.0. The content is identical. The old path schema-atoms/spec/atom-spec@1.1.0
  is historic. Consumers should update references to use schema-atoms/design-spec/."
```

**Step 2:** Republish the old atom at `schema-atoms/spec/atom-spec@1.1.0` with:

```toml
superseded_by = "schema-atoms/design-spec/atom-spec@1.1.0"
lifecycle = "historic"
```

**Step 3:** Update `ATOMS.yml` to remove `spec` from `atom_types` and add
`design-spec`. Both paths remain resolvable; old references continue to work;
the `historic` status signals consumers to migrate.

---

## Part X — Self-reference

This spec atom's own reference:

```
schema-atoms/design-spec/atom-schema-spec@1.0.0-draft
```

The Schema-Atoms Catalog Spec is the second `design-spec` atom in schema-atoms,
after the Atom Spec. Both are self-referential: the Atom Spec defines what atoms
are (including the atoms that hold specs), and this spec defines what schema-atoms
holds (including the Atom Spec).

The resolution: the Atom Spec is logically prior (it defines the substrate);
the Schema-Atoms Catalog Spec is logically posterior (it defines a catalog that
uses the substrate). Neither definition is circular at the implementation layer —
the atoms toolchain can bootstrap from the Atom Spec alone.

---

## Part XI — Open questions

**Q1: Test specs.** Where do conformance test suites and Gherkin feature files
live? They specify *expected behavior* and are normative in that sense. Options:
schema-atoms (as a new class `conformance-spec`) or a separate `test-atoms` catalog.
Deferred. Currently: no test spec atoms are published; conformance tests ship
with their implementations.

**Q2: Mathematical specifications.** Formal mathematical proofs, theorem
statements, cryptographic primitive definitions. Are these `design-spec` atoms
or a new `math-spec` class? The ML-DSA algorithm definition is a `fips` atom;
the underlying math would be `math-spec`. Low priority for Phase 1.

**Q3: Legal specifications.** Contracts, license texts, regulatory requirements.
These specify constraints but are authored by legal processes, not engineering ones.
Could be `controlled-vocabulary` (for license SPDX identifiers) or a separate
`legal-spec` class. Deferred.

**Q4: Versioning of imported standards.** When the IETF updates an RFC (rare but
happens via Errata), should the schema-atoms atom be updated? Current position:
publish a new atom version with the corrected content and supersede the old one.

**Q5: Inline vs asset payloads.** Small `controlled-vocabulary` atoms could inline
their values. Large ones need asset files. The current design supports both
(inline `values` array OR `asset` file). Should there be a size threshold above
which inline is forbidden? Deferred.

---

## Part XII — Changelog

- **1.0.0-draft** — Initial draft. Defines the six type families and 20+ classes,
  universal envelope, type-specific TOML payload sections, URL routing,
  ATOMS.yml, quorum rules, provenance for imported specs, publication workflow,
  supersession path for spec → design-spec.

