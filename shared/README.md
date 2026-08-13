This directory contains shared source files. It is not built into a separate package, so consumers should not add it as a dependency in package.json. Instead, use Typescript project references to re-use files from this directory.

Concretely, a consumer wires this directory up with two things (never a `package.json` dependency):

- The `@shared/*` path alias, in both `tsconfig.json` (`compilerOptions.paths`) and the bundler config (e.g. the `@shared` alias in `vite.config.ts`). This is the mechanism every `import` uses — e.g. `import { testDocument } from "@shared/testDocument.js"`.
- A TypeScript project reference to `../shared` (`references` in `tsconfig.json`), for build ordering and type resolution.

The `@blocknote/shared` name in this directory's `package.json` is internal-only: the package is `private` and unbuilt, is never published, and is never imported by that name. See the `@blocknote/tests` package for a reference setup.
