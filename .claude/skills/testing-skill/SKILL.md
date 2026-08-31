---
name: testing-skill
description: Instructions for writing, running, and updating unit/end-to-end tests. Should be used when prompted specifically to add tests for a given feature, bug, or regression.
---

# Testing

In most cases, once a feature, bug fix, or other modification has been written, it will need to have tests added, or existing tests updated.

## Test File Locations

### Unit Tests

`/tests/src/unit`: Contains the bulk of unit tests, mainly relating to interoperability between BlockNote's JSON format and HTML/Markdown. Also includes some miscellaneous tests, like React rendering, selection handling, and NextJS integration.

`/packages/core/src/api`: Contains mainly tests for getting, inserting, updating, and removing blocks, etc, under `/blockManipulation/commands`. Also includes tests for intermediary functionality between BlockNote and the underlying TipTap editor, like converting between blocks & nodes, or setting editor event handlers.

`/packages/xl-*`: Contain tests for functionality included in a given `xl-*` package.

### Colocated Browser Unit Tests

`packages/*/src/**/*.browser.test.{ts,tsx}`: Unit tests for browser-only implementations (e.g. canvas or DOM-dependent code) live next to the code they test, with a `.browser.test` suffix. They run as part of the browser suite in Docker (the `tests` package's browser config includes them); the packages' own node-mode vitest configs exclude them. Use this when the unit under test genuinely needs a real browser — everything else should be a plain node unit test.

### Choosing between `/tests/src/unit` and a colocated test

Both are unit tests, so "is this a unit or an integration test" is the wrong question. Pick by harness:

- `/tests/src/unit` exists to fan a **single case** out across many output formats (BlockNote HTML, external HTML, Markdown, PM nodes) and across clipboard and selection behaviour, all against the one shared `testSchema`. You contribute a case by appending to a `*TestInstances.ts` array, not by adding a test file. If the schema needs a new block type to express the case, add it to `tests/src/unit/core/testSchema.ts` (or `react/testSchema.tsx`).
- A colocated test in `packages/*/src` pins the behaviour of one function or module, and is free to declare its own schema fixture. Use it when the assertion is about internal shape (node structure, transaction steps, return values) rather than about a serialization format.

If a case belongs in both, prefer `/tests/src/unit`: one entry there produces coverage in every format at once.

### Naming a colocated test file

- When the suite covers one source file, mirror its name: `blockToNode.ts` gets `blockToNode.test.ts`.
- When it covers a behaviour spanning several modules, name it after the behaviour and put it in the directory that owns that behaviour: `containers/containers.test.ts`, `commands/insertBlocks/insertPlacement.test.ts`. This is common and fine; roughly a third of colocated test files have no same-named source file.
- Don't name a file after a schema or config feature (`contentContainers.test.ts`). Those names go stale when the feature is renamed or dropped, and the file is then stranded under a name that no longer maps to anything. Name it after the code that implements the feature instead.

### End-to-End Tests

`tests/src/end-to-end`: Tests that need a real browser and span multiple packages go here — chiefly tests which interact with the editor UI or simulate user interaction, but also browser integration tests that exercise complete flows without interaction (e.g. exporting a full document, static rendering). New subdirectories can be added if the functionality being tested is not covered by any of the existing ones. Important note about existing E2E tests - many are written poorly and should only loosely be used as reference. We want to avoid abstraction layers and `waitForTimeout` as much as possible.

## When & How to Add Tests

In general, we expect a change in code to result in failing test cases. If this does not happen, tests should be added and checked to ensure they pass with the code changes while failing without them.

However, this may not be true when adding edge case handling or a new feature, where existing tests may all continue to pass. In this case, tests should be added as necessary to cover all of the new functionality. We should still ensure that the new tests pass with the new code changes while failing without them.

We want to avoid adding end-to-end tests where it's possible to use unit tests instead.

**Don't use jsdom** (`@vitest-environment jsdom`) in new tests. It's a murky middle ground — `document` exists but rendering doesn't — which makes browser-capability checks pass while the capability itself is broken. Use the default node environment with pluggable seams for logic, and the browser suite (`tests/src/end-to-end`, vitest browser mode in Docker) for anything that needs real rendering.

## Running & Updating Tests

### Unit Tests

Unit tests can be run from the root directory using `vp run test`, which will run all of them across all directories. A specific test file may be targeted by appending its name, i.e. `vp run test fileName`. Individual tests in a file may be disabled using `skip`, i.e. `it.skip("Test name", ...)` (remember to revert this once all tests pass).

Updating tests can be done by adding the `-u` argument, i.e. `vp run test -u`. All of the other things you can do to scope which tests to target still apply.

### End-to-End Tests

End-to-end tests run in vitest browser mode (chromium, firefox and webkit) inside a Docker container, so screenshot baselines are identical locally and on CI. Run them from the repository root:

```bash
bash tests/docker-run.sh -e CI=1 -- --run [filters]
```

**Never run the browser suite natively** (`vp test -c vite.config.browser.ts` outside the container) — not even "just one file". Two failure modes, both silent: the screenshot matcher _seeds_ a new `-darwin`/`-win32` baseline for every screenshot test that has none (passing without comparing anything, and littering the tree with hundreds of unvetted PNGs — these are gitignored as a backstop, and only `-linux` baselines are tracked), and several suites genuinely behave differently outside Linux (e.g. caret placement is font-metric-dependent, so platform-shared JSON snapshots mismatch). If Docker isn't running, notify the user to launch it instead of falling back to a native run.

A specific test file may be targeted by appending (part of) its name as a filter. A single browser may be targeted with `--project "e2e (chromium)"`. Individual tests in a file may be disabled using `skip`, i.e. `test.skip("Test name", ...)` (remember to revert this once all tests pass).

Screenshot baselines can be regenerated with `--update=true` (as `e2e:updateSnaps` does). Always attach the value: vitest declares the flag as `-u, --update [type]` (it also accepts `new`/`all`/`none`), so a bare `-u` before a filter swallows the filter as its value and silently runs the **whole** suite in update mode. `--update=true` cannot, so filters stay filters in any position. Note that `-u` only rewrites baselines whose comparison **fails** — a small intended change (e.g. a short text edit) that fits inside the suite's 2% pixel tolerance leaves the baseline stale while the test passes. To force a fresh capture, delete the baseline file first. Baselines are per-browser (`<name>-<browser>-linux.png`); after regenerating, always inspect the images before committing them.

When testing a visual change, prefer writing screenshots to verify that the change is working as expected.

**Screenshots of tall content**: browser-suite tests run inside a tester iframe sized to the browser window (1280x720), and element screenshots only contain what the iframe actually paints — anything below its fold captures as blank white, silently. Growing the iframe with `page.viewport()` alone doesn't fix this at full resolution: the harness scales the iframe down to fit the window, shrinking the resulting baseline (`static.test.tsx` accepts that trade-off). For full-resolution captures use `screenshotFull` (`tests/src/utils/screenshotFull.ts`), which grows the iframe past the content and neutralizes the harness's scale transform during the capture — the same mechanism upstream Vitest adopted in vitest-dev/vitest#9745 (milestone 5.0.0; the util can be deleted once vite-plus ships it). Always eyeball newly generated baselines for truncation.
