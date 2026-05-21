# Project Description

BlockNote is a block-based rich text editor for the web. It's designed as a batteries-included product that offers a solid user experience with minimal setup. However, it also offers extensibility via plugins and custom block types.

# Issue Context

When prompted to write a new feature, fix a bug, or make some other modification to the code, the project repository on GitHub should be scanned for issues and PRs which are relevant to the task at hand. Before writing any code, a summary of these should be given. If nothing relevant is found, the task can be started immediately. Otherwise, the user should be prompted on next steps.

This should only be done for new conversations. If GitHub was already scanned in the same conversation, it does not need to be scanned again.

Once the task is done and the feature is completed, bug is fixed, etc, the user should be reminded of the relevant issues and PRs found in the initial investigation.

The GitHub CLI should be used to browse issues and PRs.

# Common Commands

All commands below are listed under `package.json` in the project root. See `vite.config.ts` for relevant configuration settings.

- `vp install`: Installs dependencies.
- `vp run dev`: Starts the dev server on port 5173.
- `vp run check`: Checks for linting and formatting issues across the project and attempt resolve issues automatically.
- `vp run build`: Builds the project.
- `vp run preview`: Previews the build on port 3000.
- `vp run test`: Runs unit tests. Append with `-u` to update snapshots. Append with a file name to target only that file.
- `vp run e2e`: Runs end-to-end tests. Append with a file name to target only that file.
- `vp run e2e:updateSnaps`: Runs end-to-end tests & updates snapshots. Append with a file name to target only that file.
- `vp help`: Prints a list of all availabel commands.

# Common Entry Points

When writing a new feature, bug fix, or other modification, it may not be immediately clear where the code for it should be. There are a few files which are good to start looking in when this is the case:

- `/packages/core/src/editor/BlockNoteEditor.ts`: Contains the class for the core BlockNote editor. Every editor command & event can be traced from here.
- `/packages/react/src/editor/BlockNoteView.tsx`: Contains the `BlockNoteViewEditor` component, which is the base for rendering the editor and its UI elements. Whenever the UI functionality (and often styling) needs to be changed, it will be a descendant of `BlockNoteViewEditor`.
- `/packages/mantine/src/BlockNoteView.tsx`: Contains the Mantine version of `BlockNoteView`. This can be thought of as a skin for `BlockNoteViewEditor` that uses the Mantine component library. Therefore, changes in `BlockNoteViewEditor` may also have to be propagted to it.
  - The same applies for `BlockNoteView.tsx` in `/packages/ariakit` and `/packages/shadcn`, though Mantine is the defacto default version of `BlockNoteView`.

# Additional Notes

- Do not create git commits.
