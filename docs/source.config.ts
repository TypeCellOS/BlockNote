import { createRequire } from "node:module";
import path from "node:path";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import ts from "typescript-5";
import { z } from "zod/v4";

// `twoslash` (which type-checks the code samples in our MDX) needs the classic
// TypeScript JavaScript API - `ts.sys`, `createLanguageService`, and friends.
// TypeScript 7 does not ship one: its `typescript` package only exposes
// `{ version }` plus a native `tsc` binary, so the `import ts from "typescript"`
// inside twoslash yields `undefined` for `ts.sys` and the docs build fails while
// highlighting the first `twoslash` code fence.
//
// We can't just add `typescript@5` to this package: `vite-plus`/`vitest` take
// TypeScript as an (optional, transitive) peer, so a second TypeScript version
// in a workspace importer splits them into multiple physical instances, and a
// package that lands on the other instance gets a second `SnapshotClient` -
// every `toMatchFileSnapshot` then fails with "The snapshot state for '...' is
// not found". (`pnpm-workspace.yaml` pins `@types/node` and `jsdom` for the same
// reason.) An `npm:` alias is invisible to pnpm's peer resolution, so it gives
// us a TypeScript 5 that can never enter a `vitest` peer key. We hand it to
// twoslash explicitly below; `typescript` itself stays on 7 for `tsc --noEmit`
// and Next's `experimental.useTypeScriptCli`.
//
// Once twoslash supports the TypeScript 7 API (per the TypeScript 7 release
// notes, an API is expected in 7.1), drop the alias and this wiring.
const require = createRequire(import.meta.url);
// Resolves to `.../typescript/lib/typescript.js`; twoslash passes the directory
// to `@typescript/vfs` to find `lib.*.d.ts`. Without it the lib files are looked
// up next to the ambient (TypeScript 7) package, where they don't exist.
const tsLibDirectory = path.dirname(require.resolve("typescript-5"));
// twoslash types this option as `typeof import("typescript")`, which here is the
// TypeScript 7 stub - `{ version, versionMajorMinor, default }`. The aliased
// TypeScript 5 has everything twoslash actually calls, but no `default` export,
// so it fails a structural check against a shape that only looks like that
// because the ambient `typescript` is the package twoslash can't use anyway.
type TwoslashOptions = NonNullable<
  NonNullable<Parameters<typeof transformerTwoslash>[0]>["twoslashOptions"]
>;
const tsModule = ts as unknown as TwoslashOptions["tsModule"];

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      // description: z.string(), // make required (unfortunately, breaks build)
      imageTitle: z.string().optional(), // add imageTitle to customize text on og image
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const pages = defineDocs({
  dir: "content/pages",
  docs: {
    schema: frontmatterSchema.extend({
      // description: z.string(), // make required (unfortunately, breaks build)
      imageTitle: z.string().optional(), // add imageTitle to customize text on og image
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const examples = defineDocs({
  dir: "content/examples",
  docs: {
    schema: frontmatterSchema.extend({
      author: z.string().optional(),
      isPro: z.boolean().optional(),
      imageTitle: z.string().optional(), // add imageTitle to customize text on og image
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },

  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          twoslashOptions: { tsModule, tsLibDirectory },
        }),
      ],
      // important: Shiki doesn't support lazy loading languages for codeblocks in Twoslash popups
      // make sure to define them first (e.g. the common ones)
      langs: ["js", "jsx", "ts", "tsx", "css"],
    },
  },
});
