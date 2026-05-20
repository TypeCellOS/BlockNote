# Project Description

BlockNote is a block-based rich text editor for the web. It's designed as a batteries-included product that offers a solid user experience with minimal setup. However, it also offers extensibility via plugins and custom block types.

# Issue Context

When prompted to write a new feature, fix a bug, or make some other modification to the code, the project repository on GitHub should be scanned for issues and PRs which are relevant to the task at hand. Before writing any code, a summary of these should be given. If nothing relevant is found, the task can be started immediately. Otherwise, the user should be prompted on next steps.

This should only be done for new conversations. If GitHub was already scanned in the same conversation, it does not need to be scanned again.

Once the task is done and the feature is completed, bug is fixed, etc, the user should be reminded of the relevant issues and PRs found in the initial investigation.

The GitHub CLI should be used to browse issues and PRs.

# Common Entry Points

When writing a new feature, bug fix, or other modification, it may not be immediately clear where the code for it should be. There are a few files which are good to start looking in when this is the case:

- `/packages/core/src/editor/BlockNoteEditor.ts`: Contains the class for the core BlockNote editor. Every editor command & event can be traced from here.
- `/packages/react/src/editor/BlockNoteView.tsx`: Contains the `BlockNoteViewEditor` component, which is the base for rendering the editor and its UI elements. Whenever the UI functionality (and often styling) needs to be changed, it will be a descendant of `BlockNoteViewEditor`.
- `/packages/mantine/src/BlockNoteView.tsx`: Contains the Mantine version of `BlockNoteView`. This can be thought of as a skin for `BlockNoteViewEditor` that uses the Mantine component library. Therefore, changes in `BlockNoteViewEditor` may also have to be propagted to it.
  - The same applies for `BlockNoteView.tsx` in `/packages/ariakit` and `/packages/shadcn`, though Mantine is the defacto default version of `BlockNoteView`.

# Testing

In most cases, once a feature, bug fix, or other modification has been written, it will need to have tests added, or existing tests updated.

## Test File Locations

### Unit Tests

`/tests/src/unit`: Contains the bulk of unit tests, mainly relating to interoperability between BlockNote's JSON format and HTML/Markdown. Also includes some miscellaneous tests, like React rendering, selection handling, and NextJS integration.

`/packages/core/src/api`: Contains mainly tests for getting, inserting, updating, and removing blocks, etc, under `/blockManipulation/commands`. Also includes tests for intermediary functionality between BlockNote and the underlying TipTap editor, like converting between blocks & nodes, or setting editor event handlers.

`/packages/xl-*`: Contain tests for functionality included in a given `xl-*` package.

### End-to-End Tests

`tests/src/end-to-end`: Any test which interacts with the editor UI or simulates user interaction goes here. New subdirectories can be added if the functionality being tested is not covered by any of the existing ones. Important note about existing E2E tests - many are written poorly and should only loosely be used as reference. We want to avoid abstraction layers and `waitForTimeout` as much as possible.

## When & How to Add Tests

In general, we expect a change in code to result in failing test cases. If this does not happen, tests should be added and checked to ensure they pass with the code changes while failing without them.

However, this may not be true when adding edge case handling or a new feature, where existing tests may all continue to pass. In this case, tests should be added as necessary to cover all of the new functionality. We should still ensure that the new tests pass with the new code changes while failing without them.

We want to avoid adding end-to-end tests where it's possible to use unit tests instead.

## Running & Updating Tests

### Unit Tests

Unit tests can be run from the root directory using `vp run test`, which will run all of them across all directories. A specific test file may be targeted by appending its name, i.e. `vp run test fileName`. Individual tests in a file may be disabled using `skip`, i.e. `it.skip("Test name", ...)` (remember to revert this once all tests pass).

Updating tests can be done by adding the `-u` argument, i.e. `vp run test -u`. All of the other things you can do to scope which tests to target still apply.

### End-to-End Tests

End-to-end tests run inside a docker container. While its possible to run them outside of it, we do not have existing snapshots to compare results with, and the results sometimes differ to when they're run within Docker, so it's not worth doing.

To run end-to-end tests, you must first build the project and run the preview. You can do this by running `vp start` from the root directory.

You can then run the tests from the `/tests` directory using the following command:

```
docker run --rm -e RUN_IN_DOCKER=true --network host -v $(pwd)/..:/work/ -w /work/tests -it mcr.microsoft.com/playwright:v1.51.1-noble npx playwright test
```

A specific test file may be targeted by appending its name, i.e. `... npx playwright test fileName`. Individual tests in a file may be disabled using `skip`, i.e. `test.skip("Test name", ...)` (remember to revert this once all tests pass).

Updating tests can be done by adding the `-u` argument, i.e. `... npx playwright test -u`. All of the other things you can do to scope which tests to target still apply.

# Additional Notes

- Do not create git commits.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
