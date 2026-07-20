# Project Description

BlockNote is a block-based rich text editor for the web. It's designed as a batteries-included product that offers a solid user experience with minimal setup. However, it also offers extensibility via plugins and custom block types.

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
