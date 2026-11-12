---
name: triage
description: Use when triaging BlockNote reports or asked to work on, fix, or investigate an issue number or URL. Check existing PRs and classify before coding; require confirmation before implementing features.
---

# Triage

## Modes

- **Review:** “Check the latest 3 issues with /triage.” Fetch open issues in the current repository, excluding PRs; “latest” means newest by creation date. Review the requested batch and recommend actions without implementing or launching agents.
- **Work:** “Work on issue #1234.” Run the checks below, then reproduce the reported defect before diagnosing or changing code. If reproduction fails or is blocked, report the evidence and ask for missing details rather than attempting a speculative fix. For a feature, stop and ask whether the user wants to implement it. Clarify uncertain or mixed scope before proceeding with that portion.

## Classify

**Issues** are defects in existing code, UX, or DX—including usability, accessibility, content preservation, and documentation of existing capabilities. They need not be regressions. They belong in **GitHub Issues**.

**Features** enable new behaviors: capabilities, APIs, stored information, formats, or expanded support. Internal capabilities do not imply public API support. Features belong in **GitHub Discussions**.

Judge the supported contract from the product model, documentation, code, and maintainer intent—not labels, proposed solutions, current behavior alone, or intuition. Ask about unsettled product policy.

### Borderline examples

| Issue                                                  | Feature                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| A field cannot accommodate ordinary supported content. | A richer editing mode is needed.                            |
| Submitted edits are lost.                              | Unsubmitted drafts should survive dismissal.                |
| Supported HTML formatting is parsed incorrectly.       | Additional source-specific conventions need interpretation. |
| Existing selection/copy behavior fails.                | Internal selection capabilities need a public API.          |
| An existing button is unnamed or unreachable.          | Authors need new document metadata.                         |

Inspect actual inputs; examples illustrate boundaries, not automatic classifications. Size determines readiness, not category: a large defect is still an issue; a small enhancement is still a feature.

## Check existing work

1. Read the live report and replies. Identify the contract, inputs, version, and environment; check existing configuration.
2. Search linked history and PRs by report number and behavior keywords across **open, closed, and merged** states. Inspect coverage of the exact report; check related reports too.
3. Distinguish proposed, merged, and runtime-verified fixes. Reproduce the actual interaction on current code when needed. Synthetic tests, other platforms, or failure to reproduce do not prove resolution.

## Decide and report

- **Focused defect:** in review mode, recommend investigation/fix, potentially by an agent; in work mode, first establish a failing reproduction, then use it to understand the cause, implement a focused fix, and verify the reproduction passes with regression coverage. Follow repository instructions; explain broad scope or blockers rather than silently expanding work. Apply the same reproduction-first requirement to delegated fixes.
- **Feature:** recommend Discussions; obtain confirmation before implementation.
- **Existing PR:** prefer validation or continuation over competing work. Verify apparent merged fixes where feasible; report resolved behavior rather than patching again. Closed, unmerged PRs are not resolutions.
- **Configuration solution:** explain it instead of adding redundant behavior.
- **Related reports:** group coordinated work, but do not infer a shared cause from similar symptoms alone.

For each report, give **link, short summary, classification and reason, matching PRs/status/evidence, and next action**. Mention absent matches or incomplete searches. Skip previously decided reports in ongoing reviews; update an existing decision record, separating plans from completed actions.

Neither mode authorizes spawning agents or public changes (moving/closing reports, comments, PRs, commits). Obtain permission; preserve supplied public wording exactly and discuss inaccuracies before posting. Define scope and reporting expectations when delegating.
