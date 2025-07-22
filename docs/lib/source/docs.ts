import { docs } from "@/.source";
import { InferMetaType, InferPageType, loader } from "fumadocs-core/source";

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/docs",
  // icon(icon) {
  //   if (icon && icon in icons)
  //     return createElement(icons[icon as keyof typeof icons]);
  // },
  source: docs.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
