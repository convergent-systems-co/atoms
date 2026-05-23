"""Issue body templates for create-issues.py.

Each template returns a Markdown string given the relevant dict from issues.json.
Keep templates pure — no I/O, no GitHub calls.
"""


def epic_body(epic: dict, spec_url: str, design_url: str) -> str:
    return f"""## Goal
{epic['goal']}

## Spec reference
- [Atom Schema Spec v1.0.0-draft]({spec_url}) — {epic['spec_sections']}
- [Design doc]({design_url})

## Sub-issues
_Populated automatically as features are created._

## Acceptance criteria
- [ ] All child features complete
- [ ] `atoms validate` passes on every atom produced by this epic
- [ ] CI green on schema-atoms `main`
"""


def feature_body(feature: dict, epic_number: int) -> str:
    return f"""## Goal
{feature['goal']}

## Parent
Epic #{epic_number}

## Spec reference
- {feature['spec_section']}

## Sub-issues
_Populated automatically as stories are created._

## Acceptance criteria
- [ ] All child stories complete
- [ ] Behavior matches spec section {feature['spec_section']}
- [ ] Tests added/updated
"""


def story_body(story: dict, feature_number: int) -> str:
    return f"""## Goal
{story['title']}

## Parent
Feature #{feature_number}

## Spec reference
- {story['spec_section']}

## Acceptance criteria
- [ ] Implementation complete
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] PR merged
"""


def spike_body(spike: dict, spec_url: str) -> str:
    return f"""## Question
{spike['title']}

## Spec reference
- [Atom Schema Spec v1.0.0-draft]({spec_url}) — {spike['spec_section']}

## Outcome
Decision recorded in:
- An ADR under `docs/adrs/` in schema-atoms
- A `[[spec.amendments]]` entry on `atom-schema-spec` for the next version

## Status
`status/needs-info` — awaiting research and discussion.
"""
