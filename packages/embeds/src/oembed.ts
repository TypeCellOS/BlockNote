import type { BookmarkMetadata, ResolveResult } from "./types.js";
import { parseSourceUrl } from "./url.js";
import { fetchJson } from "./fetchJson.js";

type OEmbedCommon = {
  version: "1.0";
  title?: string;
  description?: string;
  thumbnail_url?: string;
  image_url?: string;
};
export type OEmbedResponse = OEmbedCommon &
  (
    | { type: "link" }
    | { type: "photo"; url: string; width: number; height: number }
    | { type: "video" | "rich"; html: string; width: number; height: number }
  );
export type ResolveOEmbed = (
  url: string,
  options: { signal: AbortSignal },
) => Promise<ResolveResult<OEmbedResponse>>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown) {
  return typeof value === "string" ? value.slice(0, 4000) : undefined;
}
function dimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function parseOEmbed(value: unknown): OEmbedResponse | undefined {
  if (!record(value) || value.version !== "1.0") {
    return undefined;
  }
  const common: OEmbedCommon = {
    version: "1.0",
    title: text(value.title),
    description: text(value.description),
    thumbnail_url: text(value.thumbnail_url),
    image_url: text(value.image_url),
  };
  switch (value.type) {
    case "link":
      return { ...common, type: "link" };
    case "photo":
      return typeof value.url === "string" &&
        dimension(value.width) &&
        dimension(value.height)
        ? {
            ...common,
            type: "photo",
            url: value.url,
            width: value.width,
            height: value.height,
          }
        : undefined;
    case "video":
    case "rich":
      return typeof value.html === "string" &&
        value.html.length <= 128 * 1024 &&
        dimension(value.width) &&
        dimension(value.height)
        ? {
            ...common,
            type: value.type,
            html: value.html,
            width: value.width,
            height: value.height,
          }
        : undefined;
    default:
      return undefined;
  }
}

export function metadataFromOEmbed(value: OEmbedResponse): BookmarkMetadata {
  const imageUrl = [
    value.image_url,
    value.thumbnail_url,
    value.type === "photo" ? value.url : undefined,
  ].find((url) => url !== undefined && parseSourceUrl(url) !== undefined);
  return { title: value.title, description: value.description, imageUrl };
}

/** Standard oEmbed transport; does not authorize any returned HTML or iframe origin. */
export function createOEmbedClient({
  endpoint,
}: {
  endpoint: string;
}): ResolveOEmbed {
  return async function resolve(url, { signal }) {
    if (!parseSourceUrl(url)) {
      return { status: "unavailable" };
    }
    const target = new URL(
      endpoint,
      typeof location === "undefined" ? undefined : location.href,
    );
    target.searchParams.set("url", url);
    target.searchParams.set("format", "json");
    const result = await fetchJson(
      new Request(target, {
        signal,
        credentials: "omit",
        headers: { Accept: "application/json" },
      }),
    );
    if (result.status === "unavailable") {
      return result;
    }
    const value = parseOEmbed(result.value);
    return value ? { status: "success", value } : { status: "unavailable" };
  };
}
