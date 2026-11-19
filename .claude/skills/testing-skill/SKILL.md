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

IMPORTANT: ONLY use `.browser.test.ts` when we are missing APIs in Node (e.g. DOM, window APIs, etc). If it can be tested in Node without touching or having to mock browser APIs, it should be done for speed. We should not be spinning up a browser to test that 2 + 2 = 4. We used to leverage JSDom for simulating part of the browser API within Node, this is now FORBIDDEN for new files, if something touches a browser API, it ought to run in the browser.

Maxim: we should be testing as low-level in the ladder as we can. Most tests should be colocated (Rung 1); broader integrations (Rung 2) and journeys (Rung 3) should be progressively fewer. E2E tests are a last line of defense, not the first place you add tests to.

Given that files import each other, there can be overlap and ambiguity to where something should be tested. Generally, we should be writing at least an order of magnitude more unit tests than integration tests. Where, in a parent-child relationship, the child should be testing it's own unit (the code and logic that it actively owns, not imported, or shapes it receives from elsewhere), and the parent should assume all its children's work. The parent should test for concerns that it owns (its unit), and for interactions with external behaviors that it's children cannot verify on it's own (its integration of its children). Integration tests are for verifying boundaries, not duplicating work.

## Rules

- **Cover user-important behavior and applicable categories**, not every branch or state combination. Low-value defensive branches need not be exercised merely for coverage.
- **Reported bugs generally warrant regression tests.** Prove regressions red-first against the bug, then green with the fix. Follow TDD for new behavior; modifying existing tests does not require manufacturing another red run. Styling fixes may reasonably lack regression tests when automation is cumbersome or implementation-coupled.
- **Use real internal dependencies.** Mock/fake only when necessary, such as external services. Observation-only spies are fine.
- **Use public editor APIs.** Do not reach into `editor._tiptapEditor`. Use `editor.prosemirrorView` when the view is needed; prefer `editor.transact` for current document/selection reads and transactions over `editor.prosemirrorState`.
- **Prefer BlockNote operations over ProseMirror equivalents.** Establish documents with `initialContent`, `insertBlocks`, `updateBlock`, and other BlockNote APIs rather than hand-building internal nodes or mutating transactions when an equivalent exists. Convert blocks to ProseMirror nodes only when the test needs them.
- **Distinguish unit from integration by scope.** A function changing block color is a unit contract; clicking a button and checking the editor/UI color change crosses subsystems.
- **Arrange → Act → Assert.** Name the outcome, establish the case, exercise the real entry point, and assert its relevant behavior. Repeated act/assert pairs are fine when clearer. Setup APIs must not perform the action the test claims to verify.
- **Share understandable conventions.** Prefer `setupEditor` and common mechanics to bespoke setup. Abstract repeated patterns when they improve understanding. Choose inline cases versus `it.for` for readability, not minimum line count.
- **Keep assertions relevant.** Verify the owner's contract without coupling to unrelated details. For example, an extra unused callback argument should not break a test that only cares whether it was called.
- **Wait for observable state.** Use retrying assertions and `expect.poll`, not arbitrary sleeps. Investigate local retries; limited retries may be warranted for inherently flaky environments, not as a substitute for readiness.
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

Use `const { editor } = await setupEditor({ ...editorOptions })` in either environment. The global `it` supplies correctly typed helpers for the current test environment; do not import `it` or a fixture-specific test function. Browser setup renders a view and additionally accepts `skin`, `props`, `children`, and `outside`, returning `rerender` too. Node setup creates a headless editor without DOM mounting or jsdom. Both preserve custom-schema types and clean up after the test.

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
