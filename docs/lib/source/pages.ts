import { type InferPageType, loader } from "fumadocs-core/source";
import { pages } from "fumadocs-mdx:collections/server";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/",
  source: pages.toFumadocsSource(),
  plugins: [],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/pages/${segments.join("/")}`,
  };
}
