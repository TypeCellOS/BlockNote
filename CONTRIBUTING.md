# Contributing

Thank you for your interest in contributing to BlockNote. This project welcomes contributions from the community. This document explains **how to participate**, **how decisions are made**, and **how to work with the codebase**.

---

## Ways to Contribute

There are many ways to contribute to BlockNote:

- Sharing ideas, feedback, or use cases
- Reporting bugs
- Improving documentation or examples

- Proposing new features or changes
- Submitting code contributions

You do **not** need to start with code to contribute.

> Open-ended ideas, early exploration, and feedback are best shared via GitHub Discussions, while actionable work and implementation tasks are tracked as GitHub Issues.
> 

---

## Sharing Ideas and Feedback

Ideas, suggestions, and early proposals are welcome and encouraged.

- Start with a GitHub Issue or Discussion
- Focus on the **problem or need**, not just a solution
- Keep it lightweight — early feedback does not require an RFC

See **How Work Flows** for an overview of how ideas move through the project.

---

## Proposing Significant Changes (RFCs)

Some changes require an RFC (Request for Comments) before they can be accepted.

An RFC is required when a change:

- Affects core behavior or public APIs
- Introduces new core concepts
- Sets long-term technical precedent
- Has broad impact across users or integrations

Anyone may propose an RFC.

RFCs are intentionally higher-effort and are required only when a change is ready for formal consideration.

See **[RFC_PROCESS.md](/RFC_PROCESS.md)** and **[RFC_TEMPLATE.md](/.github/RFC_TEMPLATE.md)** for details.

---

## Code Contributions

### Small Changes

For small, low-risk changes (bug fixes, documentation, minor improvements):

- Open a pull request directly
- Keep changes focused and scoped
- Include tests where appropriate

Maintainers will review and provide feedback.

---

### Larger Changes

For larger or higher-impact changes:

- Confirm whether an RFC is required
- Ensure the change aligns with an accepted RFC, if applicable
- Coordinate early with maintainers

Pull requests that introduce significant changes without prior discussion may be redirected or closed.

---

## Directory structure:

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

---

## Running the project

To run the project, open the command line in the project's root directory and enter the following commands:

```bash
# Install all required npm modules
pnpm install

# Start the example project
pnpm start
```

---

## Adding packages

- Add the dependency to the relevant `package.json` file (packages/xxx/package.json)
- Double check `pnpm-lock.yaml` to make sure only the relevant packages have been affected

---

## Packages

| Package                                                                                          | Size                                                                                                                                                                                          | Version                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@blocknote/core](https://github.com/TypeCellOS/BlockNote/tree/main/packages/core)               | <a href="https://bundlephobia.com/result?p=@blocknote/core@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/core?color=%238ab4f8&label=gzip%20size"></a>               | <a href="https://www.npmjs.com/package/@blocknote/core"><img src="https://img.shields.io/npm/v/@blocknote/core.svg?color=%23c1a8e2"></a>           |
| [@blocknote/react](https://github.com/TypeCellOS/BlockNote/tree/main/packages/react)             | <a href="https://bundlephobia.com/result?p=@blocknote/react@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/react?color=%238ab4f8&label=gzip%20size"></a>             | <a href="https://www.npmjs.com/package/@blocknote/react"><img src="https://img.shields.io/npm/v/@blocknote/react?color=%23c1a8e2"></a>             |
| [@blocknote/ariakit](https://github.com/TypeCellOS/BlockNote/tree/main/packages/ariakit)         | <a href="https://bundlephobia.com/result?p=@blocknote/ariakit@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/ariakit?color=%238ab4f8&label=gzip%20size"></a>         | <a href="https://www.npmjs.com/package/@blocknote/ariakit"><img src="https://img.shields.io/npm/v/@blocknote/ariakit?color=%23c1a8e2"></a>         |
| [@blocknote/mantine](https://github.com/TypeCellOS/BlockNote/tree/main/packages/mantine)         | <a href="https://bundlephobia.com/result?p=@blocknote/mantine@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/mantine?color=%238ab4f8&label=gzip%20size"></a>         | <a href="https://www.npmjs.com/package/@blocknote/mantine"><img src="https://img.shields.io/npm/v/@blocknote/mantine?color=%23c1a8e2"></a>         |
| [@blocknote/shadcn](https://github.com/TypeCellOS/BlockNote/tree/main/packages/shadcn)           | <a href="https://bundlephobia.com/result?p=@blocknote/shadcn@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/shadcn?color=%238ab4f8&label=gzip%20size"></a>           | <a href="https://www.npmjs.com/package/@blocknote/shadcn"><img src="https://img.shields.io/npm/v/@blocknote/shadcn?color=%23c1a8e2"></a>           |
| [@blocknote/server-util](https://github.com/TypeCellOS/BlockNote/tree/main/packages/server-util) | <a href="https://bundlephobia.com/result?p=@blocknote/server-util@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/server-util?color=%238ab4f8&label=gzip%20size"></a> | <a href="https://www.npmjs.com/package/@blocknote/server-util"><img src="https://img.shields.io/npm/v/@blocknote/server-util?color=%23c1a8e2"></a> |

---

## Releasing

This diagram illustrates the release workflow for the BlockNote monorepo.

![Release Workflow](./.resources/release-workflow.excalidraw.svg)

Essentially, when the maintainers have decided to release a new version of BlockNote, they will:

 1. Check that the `main` branch is in a releasable state:
    - CI status of main branch is green
    - Builds are passing
 2. Bump the package versions using the `pnpm run deploy` command. This command will:
    1. Based on semantic versioning, determine the next version number.
    2. Apply the new version number to all publishable packages within the monorepo.
    3. Generate a changelog for the new version.
    4. Commit the changes to the `main` branch.
    5. Create a new git tag for the new version.
    6. Push the changes to the `origin` remote.
    7. Create a new GitHub Release with the same name as the new version.
    8. Trigger a release workflow.

The release workflow will:

1. Checkout the `main` branch.
2. Install the dependencies.
3. Build the project.
4. Login to npm.
5. Publish the packages to npm.

### Publishing a new package

From time to time, you may need to publish a new package to npm. To do this, you cannot just deploy the package to npm, you need to:

 1. Run `nx release version --dry-run` and check that the version number is correct for the package.
    - Once this is done, you can run `nx release version` to actually apply the version bump locally (staged to your local git repo).
 2. Run `nx release changelog --from <prev-version> <new-version> --dry-run` and check that the changelog is correct for the package.
    - Once this is done, you can run the same command without the `--dry-run` flag to actually apply the changelog, commit & push the changes to the `main` branch.
 3. The release workflow will automatically publish the package to npm.
