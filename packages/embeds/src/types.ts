import type { ComponentType } from "react";
import type { DefaultBlockSchema } from "@blocknote/core";

export type BookmarkMetadata = {
  title?: string;
  description?: string;
  imageUrl?: string;
};
export type ResolveResult<T> =
  | { status: "success"; value: T }
  | { status: "unavailable" };
export type ResolveMetadata = (
  url: string,
  options: { signal: AbortSignal },
) => Promise<ResolveResult<BookmarkMetadata>>;
export type EmbedViewProps = { url: string };
export type EmbedProvider = {
  id: string;
  matches: (url: URL) => boolean;
  component: ComponentType<EmbedViewProps>;
};
export type EmbedsOptions = {
  providers: readonly EmbedProvider[];
  resolveMetadata?: ResolveMetadata;
};

export const bookmarkConfig = {
  type: "bookmark",
  content: "none",
  propSchema: {
    originalUrl: { default: "" },
    title: { default: "" },
    description: { default: "" },
    imageUrl: { default: "" },
  },
} as const;
export const embedConfig = {
  type: "embed",
  content: "none",
  propSchema: { originalUrl: { default: "" }, providerId: { default: "" } },
} as const;

export type EmbedsBlockSchema = {
  paragraph: DefaultBlockSchema["paragraph"];
  bookmark: typeof bookmarkConfig;
  embed: typeof embedConfig;
};
