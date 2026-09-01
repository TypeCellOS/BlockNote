import { type InferPageType, loader } from "fumadocs-core/source";
import { examples } from "fumadocs-mdx:collections/server";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/examples",
  source: examples.toFumadocsSource(),
  plugins: [],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/examples/${segments.join("/")}`,
  };
}

/**
 * Consumed via the `import * as examples` namespace in
 * app/llms-full.txt/route.ts (`source.getLLMText(...)`), which static
 * analysis can miss — keep this exported.
 *
 * @public
 */
export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}`;
}
