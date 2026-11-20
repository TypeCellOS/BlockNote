import type {
  BlockFromConfigNoChildren,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import type { bookmarkConfig, embedConfig } from "../types.js";
import { parseSourceUrl } from "../url.js";

export type SourceBlock =
  | BlockFromConfigNoChildren<
      typeof bookmarkConfig,
      InlineContentSchema,
      StyleSchema
    >
  | BlockFromConfigNoChildren<
      typeof embedConfig,
      InlineContentSchema,
      StyleSchema
    >;

/** Saved text only: no editor, providers, metadata resolution or remote thumbnails. */
export function sourceContent(block: SourceBlock) {
  const source = block.props.originalUrl;
  const title = block.type === "bookmark" ? block.props.title : "";
  return {
    label: title || source || "Invalid source URL",
    description: block.type === "bookmark" ? block.props.description : "",
    source,
    href: parseSourceUrl(source) ? source : undefined,
  };
}
