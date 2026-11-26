# Component browser test structure

`component-browser-tests.mjs` is a local Oxlint JavaScript plugin, loaded by
`vite.config.ts`. The explicit file list in `vite.config.ts` covers the FormattingToolbar and
Heading browser suites. Older component suites must be migrated before adding
them to that list.

- Exactly one top-level owner `describe`, named after the full filename before
  `.browser.test.tsx` (or `.ts`). `NestBlockButtons` owns both button exports;
  `BasicTextStyleButton` and controller files keep their full names. No import
  analysis or singularization guesses are used to infer the owner.
- Direct child groups are an ordered, unique subset of `unit`, `integration`,
  `aria`, `axe`, `keyboard`. Missing groups are fine; unknown groups are not.
  `unit` tests the owner's internal behavior; `integration` tests its interactions
  across components; `aria` tests ARIA attributes, behaviors, and snapshots;
  `axe` tests scan results and violations; `keyboard` tests functionality through
  keyboard input.
- Tests belong inside those groups. Scenario describes may nest further.
- Empty describes, including hooks-only or comments-only placeholders, fail.
  Emptiness means no syntactic test registration in the describe's subtree, not
  proof that a test will execute. Skipped/todo tests still count as declarations.

The rule resolves Vitest globals and named/namespace imports from `vite-plus/test`
or `vitest`, including aliases, shadowing, and common modifiers/parameterized
calls. Owner/category titles must be static strings, and describe callbacks must
be inline functions with block bodies. It intentionally does not evaluate code,
resolve fixture re-exports or arbitrary wrapper helpers, infer test categories
from assertions, or autofix ordering (moving hooks can change behavior).
Tagged-template parameterization and generated suites are outside this pilot's
supported declaration style. Extend the focused cases before expanding support.

Run the focused tests against the installed Oxlint engine (no browser needed):

```sh
pnpm exec node --test scripts/lint/component-browser-tests.test.mjs
vp run lint packages/react/src/components/FormattingToolbar packages/core/src/blocks/Heading/Heading.browser.test.tsx
```

The tests use an isolated temporary config and TSX source fixtures; they do not
modify real component tests. No new package dependency is required.

# Content from outside the editor

Content from outside the editor (a paste, a drop, an HTML or markdown string)
can load a resource and run an event handler in the active document. The code
handles it only in `detachedDoc()` (`packages/core/src/util/detachedDoc.ts`).

`detached-doc.mjs` is a local Oxlint JavaScript plugin with one rule,
`blocknote-dom/no-active-document`. `vite.config.ts` turns it on for the source
files of `@blocknote/core`. It flags member access and destructuring for
`cloneNode` and `createHTMLDocument` when the property name is static. Broader
checks on `document` and `ownerDocument` are deferred.

A line gives one finding. A correct use has an exception on the line before
it: `// oxlint-disable-next-line blocknote-dom/no-active-document -- <reason>`.

```sh
pnpm exec node --test scripts/lint/detached-doc.test.mjs
vp run lint packages/core
```
