# scripts/issue-creation

Idempotently creates the schema-atoms issue hierarchy from the Atom Schema Spec v1.0.0-draft. See
`docs/superpowers/specs/2026-05-23-schema-atoms-issue-decomposition-design.md` for the design.

## Usage

```bash
# Dry-run (prints what would be created, no GitHub mutations)
python scripts/issue-creation/create-issues.py --dry-run

# Apply
python scripts/issue-creation/create-issues.py --apply
```

## Re-run semantics

- **Labels** — created with `gh label create`; pre-existing labels are skipped.
- **Issues** — matched by exact title against `gh issue list`. If an issue with the same title
  already exists in `convergent-systems-co/schema-atoms`, it is reused (sub-issue links are
  added/checked but the issue is not duplicated or edited).
- **Sub-issue links** — added via GraphQL `addSubIssue` mutation. Existing links are detected
  via `subIssuesSummary.total` + listing and not re-added.

The script writes `state.json` (gitignored) caching title→number mappings to avoid repeated lookups
on re-run. Safe to delete; the script will rebuild it.

## Inputs

- `issues.json` — full hierarchy: labels, epics, features, stories, spikes.
- `templates.py` — body templates (epic, feature, story, spike).

## Outputs

- ~80 issues in `convergent-systems-co/schema-atoms`.
- Updates `state.json` after each successful creation.
