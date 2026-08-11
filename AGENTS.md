# Project Description

BlockNote is a block-based rich text editor for the web. It's designed as a batteries-included product that offers a solid user experience with minimal setup. However, it also offers extensibility via plugins and custom block types.

# Code Conventions

- **Leverage the type system so mistakes surface at compile time, not runtime.** Model states and outcomes explicitly: discriminated unions over boolean flags with optional fields, no `any` or casts that hide a case a caller should handle, exhaustive `switch`es over union members. If the compiler can enforce a contract, prefer that over documentation or runtime checks.
- **Expected failures are values, not exceptions.** When an operation can fail as part of normal use (canonical example: parsing user input, like LaTeX or Mermaid source), that failure is part of the function's contract — so it belongs in the return type. Catch it at the lowest level (the small adapter around the throwing third-party call) and convert it into a Result-style discriminated union (e.g. `{ error?: undefined; ...data } | { error: string }`). The failure then propagates through the type system, and the compiler forces every caller to decide how to handle it. Exceptions don't appear in TypeScript signatures, so a thrown expected error is invisible to callers — and a `try/catch` around a whole pipeline conflates expected failures with genuine bugs.
- **Exceptions are only for unexpected failures** — broken invariants, environment or infrastructure problems, programmer errors. Let them propagate and fail loudly; don't catch-and-continue. Corollary: never render a caught exception's message into user-facing output (documents, UI) — a catch-all can capture anything, and arbitrary messages can leak internals. Only messages carried by typed expected-error results are known-safe to display.
- **Prefer `function name() {}` declarations over `const name = () => {}`** for named functions (anonymous callbacks and returned closures can stay arrows).

# Common Commands

All commands below are listed under `package.json` in the project root. See `vite.config.ts` for relevant configuration settings.

- `vp install`: Installs dependencies.
- `vp run dev`: Starts the dev server on port 5173.
- `vp run check`: Checks for linting and formatting issues across the project and attempt resolve issues automatically.
- `vp run lint`: Checks for linting & typee-check issues across the project and attempt resolve issues automatically. DO NOT USE `tsc`, or `pretter`, only lint
- `vp run format`: Checks for formatting issues across the project and attempt resolve issues automatically. DO NOT USE `tsc`, or `pretter`, only format
- `vp run build`: Builds the project.
- `vp run preview`: Previews the build on port 3000.
- `vp run test`: Runs unit tests. Append with `-u` to update snapshots. Append with a file name to target only that file.
  - To run individual unit tests, use `vp run test <file>`. For example, `vp run test packages/core/src/extensions/Versioning/inMemoryVersioning.test.ts`.
- `vp run e2e`: Runs end-to-end tests. Append with a file name to target only that file.
- `vp run e2e:updateSnaps`: Runs end-to-end tests & updates snapshots. Append with a file name to target only that file.
- `vp help`: Prints a list of all available commands.

ONLY USE `vp` or `pnpm`, never `npm` or `yarn`. `vpx` can do what `pnpx` does

# Common Entry Points

When writing a new feature, bug fix, or other modification, it may not be immediately clear where the code for it should be. There are a few files which are good to start looking in when this is the case:

- `/packages/core/src/editor/BlockNoteEditor.ts`: Contains the class for the core BlockNote editor. Every editor command & event can be traced from here.
- `/packages/react/src/editor/BlockNoteView.tsx`: Contains the `BlockNoteViewEditor` component, which is the base for rendering the editor and its UI elements. Whenever the UI functionality (and often styling) needs to be changed, it will be a descendant of `BlockNoteViewEditor`.
- `/packages/mantine/src/BlockNoteView.tsx`: Contains the Mantine version of `BlockNoteView`. This can be thought of as a skin for `BlockNoteViewEditor` that uses the Mantine component library. Therefore, changes in `BlockNoteViewEditor` may also have to be propagted to it.
  - The same applies for `BlockNoteView.tsx` in `/packages/ariakit` and `/packages/shadcn`, though Mantine is the defacto default version of `BlockNoteView`.

# Additional Notes

- Do not create git commits, unless asked for directly, and do not add Co-Authored-By lines to commits.
