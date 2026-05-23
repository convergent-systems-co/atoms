#!/usr/bin/env python3
"""Idempotently create the schema-atoms issue hierarchy.

Reads issues.json, creates labels + issues + sub-issue links via gh CLI and
the GitHub GraphQL API. Re-run safe: existing labels and existing issues
(matched by title) are skipped.

Usage:
    python3 create-issues.py --dry-run    # print plan, no mutations
    python3 create-issues.py --apply      # do it
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
ISSUES_JSON = HERE / "issues.json"
STATE_JSON = HERE / "state.json"

# Load templates by absolute path because the directory has a dash in its name.
_spec = importlib.util.spec_from_file_location("templates", HERE / "templates.py")
templates = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(templates)


def sh(cmd: list[str], check: bool = True, input_text: str | None = None) -> str:
    """Run a command, return stdout. Raises on non-zero exit unless check=False."""
    r = subprocess.run(cmd, capture_output=True, text=True, input=input_text)
    if check and r.returncode != 0:
        sys.stderr.write(f"FAIL: {' '.join(cmd)}\n{r.stderr}\n")
        sys.exit(1)
    return r.stdout.strip()


def load_state() -> dict:
    if STATE_JSON.exists():
        return json.loads(STATE_JSON.read_text())
    return {"issues": {}, "labels_created": []}


def save_state(state: dict) -> None:
    STATE_JSON.write_text(json.dumps(state, indent=2))


def find_existing_issue(repo: str, title: str) -> int | None:
    """Return issue number if an issue with this exact title exists, else None."""
    out = sh([
        "gh", "issue", "list", "--repo", repo, "--state", "all",
        "--search", f'"{title}" in:title',
        "--json", "number,title", "--limit", "100",
    ])
    if not out:
        return None
    items = json.loads(out)
    for it in items:
        if it["title"] == title:
            return it["number"]
    return None


def create_label(repo: str, name: str, color: str, description: str, dry_run: bool) -> None:
    if dry_run:
        print(f"  [dry-run] create label {name} (color {color})")
        return
    r = subprocess.run(
        ["gh", "label", "create", name, "--color", color, "--description", description, "--repo", repo],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        print(f"  created label {name}")
    elif "already exists" in r.stderr.lower():
        print(f"  label {name} already exists (skipped)")
    else:
        sys.stderr.write(f"FAIL creating label {name}: {r.stderr}\n")
        sys.exit(1)


def create_issue(repo: str, title: str, body: str, labels: list[str], dry_run: bool) -> int:
    """Create issue or return existing number. Returns issue number."""
    existing = find_existing_issue(repo, title)
    if existing is not None:
        print(f"  exists #{existing}: {title}")
        return existing
    if dry_run:
        print(f"  [dry-run] create issue: {title}")
        print(f"    labels: {labels}")
        return -1
    out = sh([
        "gh", "issue", "create", "--repo", repo,
        "--title", title,
        "--body", body,
        "--label", ",".join(labels),
    ])
    # gh prints the URL on success; extract issue number from the trailing path component
    num = int(out.rstrip("/").rsplit("/", 1)[-1])
    print(f"  created #{num}: {title}")
    time.sleep(0.4)  # gentle to avoid burst rate limit
    return num


def issue_node_id(repo: str, number: int) -> str:
    """Get the GraphQL node ID for an issue."""
    owner, name = repo.split("/", 1)
    q = (
        'query($owner:String!,$name:String!,$n:Int!){'
        ' repository(owner:$owner,name:$name){'
        '  issue(number:$n){id}'
        ' }'
        '}'
    )
    out = sh([
        "gh", "api", "graphql",
        "-f", f"query={q}",
        "-F", f"owner={owner}",
        "-F", f"name={name}",
        "-F", f"n={number}",
    ])
    return json.loads(out)["data"]["repository"]["issue"]["id"]


def add_sub_issue(repo: str, parent_number: int, child_number: int, dry_run: bool) -> None:
    """Link child as a sub-issue of parent via GraphQL addSubIssue mutation."""
    if parent_number < 0 or child_number < 0:
        return  # dry-run placeholders
    if dry_run:
        print(f"    [dry-run] link #{child_number} as sub-issue of #{parent_number}")
        return
    parent_id = issue_node_id(repo, parent_number)
    child_id = issue_node_id(repo, child_number)
    mutation = (
        'mutation($parent:ID!,$child:ID!){'
        ' addSubIssue(input:{issueId:$parent,subIssueId:$child}){'
        '  issue{id}'
        ' }'
        '}'
    )
    r = subprocess.run([
        "gh", "api", "graphql",
        "-H", "GraphQL-Features: sub_issues",
        "-f", f"query={mutation}",
        "-F", f"parent={parent_id}",
        "-F", f"child={child_id}",
    ], capture_output=True, text=True)
    if r.returncode != 0:
        msg = r.stderr.lower()
        if "already" in msg or "duplicate" in msg:
            print(f"    sub-issue link #{parent_number}→#{child_number} already exists")
            return
        sys.stderr.write(f"FAIL linking sub-issue: {r.stderr}\n")
        sys.exit(1)
    print(f"    linked #{child_number} → parent #{parent_number}")
    time.sleep(0.3)


def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    dry_run = args.dry_run

    data = json.loads(ISSUES_JSON.read_text())
    repo = data["repo"]
    spec_url = data["spec_url"]
    design_url = data["design_url"]
    state = load_state()

    print(f"Repo: {repo}")
    print(f"Mode: {'DRY-RUN' if dry_run else 'APPLY'}")
    print()

    # Phase 1: labels
    print("[1/4] Creating labels...")
    for lab in data["labels"]:
        create_label(repo, lab["name"], lab["color"], lab["description"], dry_run)
    print()

    # Phase 2: epics
    print("[2/4] Creating epics, features, stories...")
    for epic in data["epics"]:
        print(f"Epic {epic['slug']}: {epic['title']}")
        epic_num = create_issue(
            repo, epic["title"],
            templates.epic_body(epic, spec_url, design_url),
            epic["labels"], dry_run,
        )
        state["issues"][epic["title"]] = epic_num
        save_state(state)
        for feature in epic["features"]:
            print(f"  Feature: {feature['title']}")
            feat_num = create_issue(
                repo, feature["title"],
                templates.feature_body(feature, epic_num),
                feature["labels"], dry_run,
            )
            state["issues"][feature["title"]] = feat_num
            save_state(state)
            add_sub_issue(repo, epic_num, feat_num, dry_run)
            # Inherit area/* and priority/* from the parent feature so stories
            # match their feature's surface; default to area/core + priority/medium
            # if the feature didn't specify one.
            feat_area = next((l for l in feature["labels"] if l.startswith("area/")), "area/core")
            feat_priority = next((l for l in feature["labels"] if l.startswith("priority/")), "priority/medium")
            for story in feature["stories"]:
                extra = story.get("extra_labels", [])
                # If the story brought its own status/*, drop the default status/triage.
                status_label = "status/triage"
                if any(l.startswith("status/") for l in extra):
                    status_label = None
                labels = ["agile/story", f"kind/{story['kind']}", feat_area, feat_priority]
                if status_label:
                    labels.append(status_label)
                labels.extend(extra)
                story_num = create_issue(
                    repo, story["title"],
                    templates.story_body(story, feat_num),
                    labels, dry_run,
                )
                state["issues"][story["title"]] = story_num
                save_state(state)
                add_sub_issue(repo, feat_num, story_num, dry_run)
    print()

    # Phase 3: spikes (standalone)
    print("[3/4] Creating spikes...")
    for spike in data["spikes"]:
        n = create_issue(
            repo, spike["title"],
            templates.spike_body(spike, spec_url),
            spike["labels"], dry_run,
        )
        state["issues"][spike["title"]] = n
        save_state(state)
    print()

    # Phase 4: summary
    print("[4/4] Done.")
    print(f"  Tracked {len(state['issues'])} issues in state.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
