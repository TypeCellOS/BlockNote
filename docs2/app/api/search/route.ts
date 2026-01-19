import { sourceDocs } from "@/lib/source/docs";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(sourceDocs, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
});
