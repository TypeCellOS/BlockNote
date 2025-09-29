import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { createGenerator, remarkAutoTypeTable } from "fumadocs-typescript";
import { bundledLanguages, getSingletonHighlighter } from "shiki";
import { z } from 'zod/v3';
const generator = createGenerator();

// suggested here: https://github.com/fuma-nama/fumadocs/issues/1095#issuecomment-2495855920
// before highlight call
await getSingletonHighlighter({
  langs: Object.keys(bundledLanguages),
});
// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      description: z.string(),
      imageTitle: z.string().optional(),
    }),
  },
});

export const examples = defineDocs({
  dir: "content/examples",
  docs: {
    schema: frontmatterSchema.extend({
      author: z.string().optional(),
      isPro: z.boolean().optional(),
    }),
  },
});

export const pages = defineDocs({
  dir: "content/pages",
  docs: {
    schema: frontmatterSchema.extend({
      description: z.string(),
      imageTitle: z.string(),
    }),
  },
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
