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

When testing a visual change, prefer writing screenshots to verify that the change is working as expected.
