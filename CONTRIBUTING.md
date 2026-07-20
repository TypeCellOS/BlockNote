# Contributing

Directory structure:

```
BlockNote
├── packages/core        - The core of the editor, which includes all logic to get the editor running in vanilla JS.
├── packages/react       - A React wrapper and UI for the editor. Requires additional components for the UI.
├── packages/ariakit     - UI components for the `react` package, made with Ariakit.
├── packages/mantine     - UI components for the `react` package, made with Mantine.
├── packages/shadcn      - UI components for the `react` package, made with Shadcn.
├── packages/server-util - Utilities for converting BlockNote documents into static HTML for server-side rendering.
├── packages/dev-scripts - A set of tools for converting example editor setups into components for the BlockNote website.
├── examples             - Example editor setups used for demos in the BlockNote website and playground.
├── docs                 - Code for the BlockNote website.
├── playground           - A basic page where you can quickly test each of the example editor setups.
└── tests                - Playwright end to end tests.
```

An introduction into the BlockNote Prosemirror schema can be found in [packages/core/src/pm-nodes/README.md](https://github.com/TypeCellOS/BlockNote/blob/main/packages/core/src/pm-nodes/README.md).

## Running

To run the project, open the command line in the project's root directory and enter the following commands:

```bash
# Install all required npm modules
pnpm install

# Start the example project
pnpm dev
```

## Commands

All commands are run from the project root with [`pnpm`](https://pnpm.io), which
wraps the `vp` ([vite-plus](https://vite-plus.dev)) task runner. The ones you'll
use day to day:

| Command          | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `pnpm install`   | Install all dependencies.                                  |
| `pnpm dev`       | Start the example editor with live reload.                 |
| `pnpm start`     | Build the packages, then preview the example editor.       |
| `pnpm test`      | Run the unit tests across all packages.                    |
| `pnpm lint`      | Lint and type-check the codebase. Run this before pushing. |
| `pnpm run check` | Auto-fix lint and formatting issues across the project.    |
| `pnpm build`     | Build all packages.                                        |
| `pnpm e2e`       | Run the Playwright end-to-end tests.                       |

To run the unit tests for a single package, run `pnpm test` from inside that
package's directory; append `-u` to update snapshots.

## Adding packages

- Add the dependency to the relevant `package.json` file (packages/xxx/package.json)
- Double check `pnpm-lock.yaml` to make sure only the relevant packages have been affected

## Packages

| Package                                                                                          | Size                                                                                                                                                                                          | Version                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@blocknote/core](https://github.com/TypeCellOS/BlockNote/tree/main/packages/core)               | <a href="https://bundlephobia.com/result?p=@blocknote/core@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/core?color=%238ab4f8&label=gzip%20size"></a>               | <a href="https://www.npmjs.com/package/@blocknote/core"><img src="https://img.shields.io/npm/v/@blocknote/core.svg?color=%23c1a8e2"></a>           |
| [@blocknote/react](https://github.com/TypeCellOS/BlockNote/tree/main/packages/react)             | <a href="https://bundlephobia.com/result?p=@blocknote/react@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/react?color=%238ab4f8&label=gzip%20size"></a>             | <a href="https://www.npmjs.com/package/@blocknote/react"><img src="https://img.shields.io/npm/v/@blocknote/react?color=%23c1a8e2"></a>             |
| [@blocknote/ariakit](https://github.com/TypeCellOS/BlockNote/tree/main/packages/ariakit)         | <a href="https://bundlephobia.com/result?p=@blocknote/ariakit@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/ariakit?color=%238ab4f8&label=gzip%20size"></a>         | <a href="https://www.npmjs.com/package/@blocknote/ariakit"><img src="https://img.shields.io/npm/v/@blocknote/ariakit?color=%23c1a8e2"></a>         |
| [@blocknote/mantine](https://github.com/TypeCellOS/BlockNote/tree/main/packages/mantine)         | <a href="https://bundlephobia.com/result?p=@blocknote/mantine@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/mantine?color=%238ab4f8&label=gzip%20size"></a>         | <a href="https://www.npmjs.com/package/@blocknote/mantine"><img src="https://img.shields.io/npm/v/@blocknote/mantine?color=%23c1a8e2"></a>         |
| [@blocknote/shadcn](https://github.com/TypeCellOS/BlockNote/tree/main/packages/shadcn)           | <a href="https://bundlephobia.com/result?p=@blocknote/shadcn@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/shadcn?color=%238ab4f8&label=gzip%20size"></a>           | <a href="https://www.npmjs.com/package/@blocknote/shadcn"><img src="https://img.shields.io/npm/v/@blocknote/shadcn?color=%23c1a8e2"></a>           |
| [@blocknote/server-util](https://github.com/TypeCellOS/BlockNote/tree/main/packages/server-util) | <a href="https://bundlephobia.com/result?p=@blocknote/server-util@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/server-util?color=%238ab4f8&label=gzip%20size"></a> | <a href="https://www.npmjs.com/package/@blocknote/server-util"><img src="https://img.shields.io/npm/v/@blocknote/server-util?color=%23c1a8e2"></a> |

## Releasing

All packages under `packages/` are released in lockstep (same version).

### Prerequisites

- You must be on the `main` branch with a clean working tree
- CI must be green
- NPM trusted publishing must be configured for all public packages (see below)

### Release flow

Run the interactive release script:

```bash
vp run deploy
```

The script will:

1. Verify preconditions (clean tree, on main, up to date with origin)
2. Present an interactive version picker (patch / minor / major / prerelease / custom) via [bumpp](https://github.com/antfu-collective/bumpp)
3. Bump the version in all `packages/*/package.json` files
4. Sync the lockfile
5. Run a smoke test build (`vp run -r build`)
6. Generate a changelog from conventional commits via [changelogen](https://github.com/unjs/changelogen)
7. Open `$EDITOR` so you can review and edit the changelog before committing
8. Commit, tag (`v{version}`), and push

Once the tag is pushed, the CI publish workflow automatically:

1. Builds all packages
2. Publishes the 13 public packages to npm with [OIDC provenance](https://docs.npmjs.com/generating-provenance-statements)
3. Creates a GitHub Release with the changelog content

### NPM trusted publishing setup

Each public `@blocknote/*` package must have a trusted publisher configured on npmjs.com:

1. Go to `https://www.npmjs.com/package/@blocknote/{name}/access`
2. Under "Trusted Publisher", select GitHub Actions
3. Set: Owner = `TypeCellOS`, Repo = `BlockNote`, Workflow = `publish.yaml`

No `NPM_TOKEN` secret is needed — publishing uses GitHub's OIDC tokens.

### Publishing a new package

When adding a new public package to the monorepo:

1. Ensure its `package.json` has `"private": false` and a `repository` field pointing to the BlockNote repo
2. Configure a trusted publisher for it on npmjs.com (see above)
3. The next release will automatically include it in the publish loop
