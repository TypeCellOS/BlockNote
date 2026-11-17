---
name: testing-skill
description: Rules and examples for placing, writing, and running unit, integration, browser component, and accessibility tests.
---

# Testing

## Decide where to test

Test behavior beside its owner, at the lowest reasonable rung of the test ladder that can reliably prove it works:

| Rung                         | Environment and location                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Unit                      | Node, colocated `packages/*/src/**/*.test.ts`.                                                          |
| 2. Browser component         | Real DOM/rendering, colocated `*.browser.test.{ts,tsx}`; includes focused component integrations.       |
| 3. Cross-package integration | Node, `tests/src/unit`; documents through real pipelines, parsing, and exports.                         |
| 4. Browser e2e               | `tests/src/end-to-end`; broader journeys and complete browser pipelines.                                |
| 5. Mobile-emulated           | `end-to-end/mobile/**`, Android browser instance; touch, viewport, emulated IME differences.            |
| 6. Real device               | Only behavior emulation cannot establish; device suite is parked on `mobile/emulator-layer` (PR #3034). |

The ladder guides placement, not a requirement to try every environment. Use a real browser, not jsdom, for clicking, keyboard navigation, focus, or rendered component behavior. Editor/document logic stays in faster Node tests, where `setupEditor` mounts the core editor in jsdom. Rungs 2 and 3 distinguish ownership/location, not strictly runtime cost.

Integrations verify boundaries, not repeat dependencies' tests. A parent assumes its children work: test toolbar composition/traversal at the toolbar, button activation at the button, and detailed document operations at their editor commands.

## Rules

- **Cover user-important behavior and applicable categories**, not every branch or state combination. Low-value defensive branches need not be exercised merely for coverage.
- **Reported bugs generally warrant regression tests.** Prove regressions red-first against the bug, then green with the fix. Follow TDD for new behavior; modifying existing tests does not require manufacturing another red run. Styling fixes may reasonably lack regression tests when automation is cumbersome or implementation-coupled.
- **Use real internal dependencies.** Mock/fake only when necessary, such as external services. Observation-only spies are fine.
- **Distinguish unit from integration by scope.** A function changing block color is a unit contract; clicking a button and checking the editor/UI color change crosses subsystems.
- **Arrange → Act → Assert.** Name the outcome, establish the case, exercise the real entry point, and assert its relevant behavior. Repeated act/assert pairs are fine when clearer. Setup APIs must not perform the action the test claims to verify.
- **Share understandable conventions.** Prefer `setupEditor` and common mechanics to bespoke setup. Abstract repeated patterns when they improve understanding. Choose inline cases versus `it.for` for readability, not minimum line count.
- **Keep assertions relevant.** Verify the owner's contract without coupling to unrelated details. For example, an extra unused callback argument should not break a test that only cares whether it was called.
- **Wait for observable state.** Use retrying assertions and `expect.poll`, not arbitrary sleeps. Investigate local retries; limited retries may be warranted for inherently flaky environments, not as a substitute for readiness.
- **Expose defects.** Notify the user when tests reveal issues. If a known defect must remain, assert its precise expected violation or use a narrow `it.fails`, with a linked issue. Do not hide it with a skip.
- **Verify proportionately.** Targeted tests, sometimes one browser, can suffice. Broaden for shared infrastructure, browser differences, or uncertain impact. Run lint/format on touched code.

## Structure and assertions

Component browser files have one owner-named outer `describe` and applicable groups in this order: `unit`, `integration`, `keyboard`, `a11y`. Reasonably cover each applicable category; omit irrelevant groups. ARIA assertions and axe scans share `a11y`; there is no separate `axe` group. Accessibility belongs alongside normal behavior.

Pure-function tests use a function-named `describe`; give integrated scenarios a separate `describe` when needed. Follow established patterns without inventing unnecessary structure.

| Assertion         | Use                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `toEqual`         | Deliberate expected values/object shapes. Use partial assertions when only part of the result matters. |
| Inline snapshot   | Small serialized results; prefer inline when readable. Size is a guideline, not a cutoff.              |
| External snapshot | Large documents, exports, or trees whose output would obscure the test.                                |

Screenshots are a last resort for behavior. Prefer state, DOM, or accessibility assertions; do not compare before/after screenshots to prove a click worked. A few deliberate subsystem baselines can guard visual regressions, with awareness of false positives.

## Golden examples

- [BasicTextStyleButton](../../../packages/react/src/components/FormattingToolbar/DefaultButtons/BasicTextStyleButton.browser.test.tsx): component behavior, editor integration, keyboard, a11y (ARIA and axe).
- [FormattingToolbar](../../../packages/react/src/components/FormattingToolbar/FormattingToolbar.browser.test.tsx): composition and traversal of child controls.

Use these as patterns, not templates to copy mechanically. For testing a React component, read [Component testing](references/component-testing.md).

## Editor setup

Use `const { editor } = await setupEditor({ ...editorOptions })` in either environment. Browser tests receive it from the shared fixture; it renders a view and additionally accepts `skin`, `props`, `children`, and `outside`, returning `rerender` too. Node tests import `test` from `tests/src/fixtures/editor.node.ts` and use the jsdom environment; their helper mounts the core editor without React or skin styles. Both preserve custom-schema types and clean up after the test. For headless logic, use `BlockNoteEditor.create` directly.

## Run

Use `vite-plus/test` imports and repository commands:

```bash
vp run test <file>
bash tests/docker-run.sh -e CI=1 -- --run <file> --retry=0
# Optional: --project "e2e (chromium)" or -t keyboard
vp run lint <files>
vp run format <files>
```

**Browser tests always run in Docker.** Native runs produce incompatible platform snapshots and behavior. If Docker is unavailable, ask the user to start it. Native screen-reader tests use their separate intentional local workflow.

For filtered snapshot updates, attach the value: `--update=true`. A bare `-u` can consume the file filter and update the entire suite.
