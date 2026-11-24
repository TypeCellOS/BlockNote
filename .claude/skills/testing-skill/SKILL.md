---
name: testing-skill
description: Rules and examples for placing, writing, and running unit, integration, browser component, and accessibility tests.
---

# Testing

## Decide where to test

Use the lowest rung that can reliably prove the behavior:

1. Colocated: `<unit-under-test>.test.ts`, or `.browser.test.ts` when browser APIs are needed. Test behavior owned by one function/component, including its integration with dependencies.
2. Subsystem integration: `/tests/src/integration/<subsystem>` for important cross-package behavior without a single owner, such as HTML conversion or clipboard pipelines.
3. End-to-end: `/tests/src/end-to-end/<feature>` for complete journeys across subsystems, including browser and server-side usage.

Use `.browser.test.ts` when the behavior needs a browser API, such as rendering, DOM events, or layout. Run model and transaction tests in Node without mounting or installing browser globals. Do not use jsdom as a test environment or as a substitute for Browser Mode. Server integration tests may exercise the actual production server DOM adapter in Node; keep that setup scoped to those integration tests.

Maxim: we should be testing as low-level in the ladder as we can. Most tests should be colocated (Rung 1); broader integrations (Rung 2) and journeys (Rung 3) should be progressively fewer. E2E tests are a last line of defense, not the first place you add tests to.

Given that files import each other, there can be overlap and ambiguity to where something should be tested. Generally, we should be writing at least an order of magnitude more unit tests than integration tests. Where, in a parent-child relationship, the child should be testing it's own unit (the code and logic that it actively owns, not imported, or shapes it receives from elsewhere), and the parent should assume all its children's work. The parent should test for concerns that it owns (its unit), and for interactions with external behaviors that it's children cannot verify on it's own (its integration of its children). Integration tests are for verifying boundaries, not duplicating work.

## Rules

- **Cover user-important behavior and applicable categories**, not every branch or state combination. Low-value defensive branches need not be exercised merely for coverage.
- **Reported bugs generally warrant regression tests.** Prove regressions red-first against the bug, then green with the fix. Follow TDD for new behavior; modifying existing tests does not require manufacturing another red run. Styling fixes may reasonably lack regression tests when automation is cumbersome or implementation-coupled.
- **Use real internal dependencies.** Mock/fake only when necessary, such as external services. Observation-only spies are fine.
- **Test through BlockNote's public behavior.** Use editor commands and document/selection APIs for model tests, and real input and observable DOM for browser tests. Don't reach into `_tiptapEditor`, `prosemirrorView`, or `prosemirrorState`. If the unit under test is itself a ProseMirror primitive, test that primitive directly rather than accessing it through an editor instance.
- **Prefer BlockNote operations over ProseMirror equivalents.** Establish documents with `initialContent`, `insertBlocks`, `updateBlock`, and other BlockNote APIs rather than hand-building internal nodes or mutating transactions when an equivalent exists. Convert blocks to ProseMirror nodes only when the test needs them.
- **Distinguish unit from integration by scope.** A function changing block color is a unit contract; clicking a button and checking the editor/UI color change crosses subsystems.
- **Arrange → Act → Assert.** Name the outcome, establish the case, exercise the real entry point, and assert its relevant behavior. Repeated act/assert pairs are fine when clearer. Setup APIs must not perform the action the test claims to verify.
- **Set up the state, not the journey.** Give the behavior under test the document, selection, focus, or history it actually needs. Seed those preconditions directly instead of typing, clicking, or navigating to create them. Keep real input when input or focus movement is itself part of the contract. Don't mount unrelated UI or build a larger fixture than the assertions require.
- **Share understandable conventions.** Prefer `setupEditor` and common mechanics to bespoke setup. Abstract repeated patterns when they improve understanding. Choose inline cases versus `it.for` for readability, not minimum line count.
- **Keep assertions relevant.** Verify the owner's contract without coupling to unrelated details. For example, an extra unused callback argument should not break a test that only cares whether it was called.
- **Wait for observable state.** Await the operation or an explicit readiness signal when the test controls the fixture. Otherwise use retrying assertions and `expect.poll`, not arbitrary sleeps. Investigate local retries; limited retries may be warranted for inherently flaky environments, not as a substitute for readiness.
- **Disable motion in browser tests.** The harness disables document CSS motion; register `onTestFinished(installBrowserNoMotion(root))` for test-owned shadow roots. Set incidental JavaScript transition durations to zero in the fixture. If timing itself is the contract, advance a scoped test clock and assert the resulting state instead of waiting for real motion.
- **Own and release test resources.** Register cleanup when acquiring a resource, or use a fixture that does it for you. Await teardown even when an assertion fails. Unmount editors and React roots before destroying the documents or removing the routes they depend on; disconnect observers and undo global changes you make. Don't rely on isolation to clean up, and don't wipe unrelated DOM or globals.
- **Expose defects.** Notify the user when tests reveal issues. If a known defect must remain, assert its precise expected violation or use a narrow `it.fails`, with a linked issue. Do not hide it with a skip.
- **Verify proportionately.** Targeted tests, sometimes one browser, can suffice. Broaden for shared infrastructure, browser differences, or uncertain impact. Run lint/format on touched code.

## Structure and assertions

For component file structure, test groups, and accessibility assertions, follow [Component testing](references/component-testing.md).

Pure-function tests use a function-named `describe`; give integrated scenarios a separate `describe` when needed. Follow established patterns without inventing unnecessary structure.

| Assertion         | Use                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `toEqual`         | Deliberate expected values/object shapes. Use partial assertions when only part of the result matters. |
| Inline snapshot   | Small serialized results; prefer inline when readable. Size is a guideline, not a cutoff.              |
| External snapshot | Large documents, exports, or trees whose output would obscure the test.                                |

For document mutations, prefer `compareDocuments(before, editor.document)` with inline snapshots. Use `toEqual` when parameterized expectations are clearer.

Screenshots are a last resort for behavior. Prefer state, DOM, or accessibility assertions; do not compare before/after screenshots to prove a click worked. A few deliberate subsystem baselines can guard visual regressions, with awareness of false positives.

## Golden examples

- Child React component test: [BasicTextStyleButton](../../../packages/react/src/components/FormattingToolbar/DefaultButtons/BasicTextStyleButton.browser.test.tsx): component behavior, editor integration, ARIA, axe, and keyboard.
- Parent React component test: [FormattingToolbar](../../../packages/react/src/components/FormattingToolbar/FormattingToolbar.browser.test.tsx): composition and traversal of child controls.

Use these as patterns, not templates to copy mechanically. For testing a React component, read [Component testing](references/component-testing.md).

## Editor setup

The global `it` supplies correctly typed fixtures; do not import `it` or a fixture-specific test function. Pick the smallest fixture that exercises the behavior:

- **Node:** `setupEditor` creates a headless editor without DOM mounting or jsdom.
- **Browser, no editor mount:** `setupEditor({ mountType: false, ...editorOptions })` uses the same Core setup as Node for tests that need a browser API (for example, parsing HTML) but not an editor view.
- **Browser, no React:** `setupEditor({ mountType: "dom", ...editorOptions })` mounts a Core editor directly into the DOM.
- **Browser with React:** `setupEditor` defaults to `mountType: "react"`, accepts `skin`, `props`, `children`, and `outside`, and returns `rerender` too.

Create editors only through these fixtures. They preserve custom-schema types and handle cleanup. Start with an unmounted fixture and mount explicitly when the host or mount lifecycle is itself under test.

For a table of independent, read-only operations (such as conversion tests), prefer one editor in a suite-scoped fixture or `beforeAll`, with matching teardown. Keep inputs and deterministic IDs isolated per case. Use a fresh editor when a case changes the document, selection, history, or plugin state, or when sharing would make a result depend on test order.

The same test works in either environment:

```ts
import { expect } from "vite-plus/test";

it("updates a block's background color", async ({ setupEditor }) => {
  const { editor } = await setupEditor({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Original text" },
    ],
  });

  editor.updateBlock("paragraph", { props: { backgroundColor: "yellow" } });

  expect(editor.getBlock("paragraph")?.props.backgroundColor).toBe("yellow");
});
```

For shortcut-handler tests, set up the desired state/selection with editor APIs, then simulate the keyboard event in node. Do not invent a browser navigation journey just to reach the shortcut's starting position. Use a browser when layout, native shortcut handling, or real focus movement is itself the contract.

## Run

Use `vite-plus/test` imports. Start with the smallest valid check:

| What you're verifying                                                                                                                  | Where to run it                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Model, state, and other Node tests                                                                                                     | `vp test --run <file>` from the owning package, using a package-relative path. No Docker.                                   |
| Allowlisted Browser Mode behavior tests (DOM, component interactions, document changes)                                                | `vp run e2e:local <file>` in native headless Chromium. It runs with no retries or snapshot updates.                         |
| Screenshot and platform-sensitive snapshots, native clipboard or mobile behavior, OS-dependent exporters, or cross-engine verification | `bash tests/docker-run.sh -e CI=1 -- --run <file> --retry=0`. Optionally add `--project "e2e (chromium)"` or `-t keyboard`. |
| Full browser/CI verification                                                                                                           | `vp run e2e` in Docker. A native pass proves only the local Chromium path.                                                  |

Install local Chromium once with `cd tests && vp exec playwright install chromium`. `LOCAL_BROWSER_FILES` in `tests/vite.config.browser.ts` lists the native files. Add a file there only after checking the entire file and its helpers for visual/platform-dependent assertions. Mixed files stay Docker-only until the behavior tests can be split out without losing coverage. Never bypass the allowlist or update baselines natively. Screen-reader tests use their separate local workflow.

For platform-standard shortcuts such as undo, use `MOD` from `tests/src/commands/browser/keyboard.ts` (Cmd on macOS, Ctrl elsewhere). When the test is specifically about one modifier, keep it explicit.

For filtered snapshot updates **in Docker**, attach the value: `--update=true`. A bare `-u` can consume the file filter and update the entire suite. Run `vp run lint <files>` and `vp run format <files>` on touched files.
