// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var docs = defineDocs({
  dir: "content/docs"
});
var examples = defineDocs({
  dir: "content/examples"
});
var pages = defineDocs({
  dir: "content/pages"
});
var source_config_default = defineConfig({
  mdxOptions: {
    // MDX options
  }
});
export {
  source_config_default as default,
  docs,
  examples,
  pages
};
