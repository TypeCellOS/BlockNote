# Examples

Here, we collect a number of examples using BlockNote. You can run the examples via the Playground (`npm start` or [online version](https://blocknote-main.vercel.app/)).

Each example directory is a self-contained project — you can open one directly in StackBlitz (`https://stackblitz.com/github/TypeCellOS/BlockNote/tree/main/examples/<group>/<example>`) to try it out or reproduce an issue against the latest release.

### (contributors) Adding examples

Just create a folder, add an `App.tsx` file (in `src/`), `.bnexample.json` and `README.md` file. Then run `npm run gen` to generate the rest of the template, and `npm install` to install any new dependencies.

Notes on `.bnexample.json`:

- `dependencies` should list only packages the example's source actually imports. `@blocknote/core`, `@blocknote/react`, the UI library, `react`, and `react-dom` are added automatically.
- `uiLib` (`"mantine"` | `"ariakit"` | `"shadcn"`, default `"mantine"`) selects which BlockNote UI package the example uses — each example gets exactly one.
- Examples with `"docs": true` are bundled together on the docs site, so `gen` fails if two of them require incompatible versions of the same package. Reconcile the versions or set `"docs": false` on one.

The generated files (`package.json`, `vite.config.ts`, etc.) are committed but must never be edited by hand — CI checks that re-running `gen` produces no diff.
