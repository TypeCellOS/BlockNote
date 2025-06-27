import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { createGenerator, remarkAutoTypeTable } from "fumadocs-typescript";
import { transformerTwoslash } from "fumadocs-twoslash";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { getSingletonHighlighter, bundledLanguages } from "shiki";
const generator = createGenerator();

// suggested here: https://github.com/fuma-nama/fumadocs/issues/1095#issuecomment-2495855920
// before highlight call
await getSingletonHighlighter({
  langs: Object.keys(bundledLanguages),
});
// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: "content/docs",
});

export const examples = defineDocs({
  dir: "content/examples",
});

export const pages = defineDocs({
  dir: "content/pages",
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      // suggested here: https://github.com/fuma-nama/fumadocs/issues/1095#issuecomment-2495855920
      langs: Object.keys(bundledLanguages) as any[],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
        }),
      ],
    },
    remarkPlugins: [[remarkAutoTypeTable, { generator }]],
  },
});
