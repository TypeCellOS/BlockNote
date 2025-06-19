import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { createGenerator, remarkAutoTypeTable } from "fumadocs-typescript";

const generator = createGenerator();

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
    remarkPlugins: [[remarkAutoTypeTable, { generator }]],
  },
});
