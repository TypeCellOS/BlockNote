import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// Options: https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: "content/docs",
});
export const examples = defineDocs({
  dir: "content/examples",
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
