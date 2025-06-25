import {
  defineDocs,
  defineConfig,
  frontmatterSchema,
  defineCollections,
} from "fumadocs-mdx/config";
import { z } from "zod";

// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      description: z.string(),
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
    }),
  },
});

export const examplesMeta = defineCollections({
  type: "meta",
  dir: "content/examples",
  schema: z.object({
    title: z.string(),
    pages: z.array(z.string()),
    root: z.literal(true).optional(),
  }),
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
