import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { z } from "zod/v4";

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

// TODO: needed?
// await getSingletonHighlighter({
//   langs: Object.keys(bundledLanguages),
// });

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
        }),
      ],
      // important: Shiki doesn't support lazy loading languages for codeblocks in Twoslash popups
      // make sure to define them first (e.g. the common ones)
      // TODO: bundledLanguages? or just this list?
      langs: ["js", "jsx", "ts", "tsx", "css"],
    },
  },
});
