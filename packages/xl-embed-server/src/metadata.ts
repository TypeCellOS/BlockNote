import { dimension } from "./oembed.js";
import type { OEmbedLink } from "./types.js";
import { parseHttpUrl } from "./url.js";
import type { HtmlHead } from "./htmlHead.js";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function documentBase(head: HtmlHead, page: URL): URL {
  return head.baseHref === undefined
    ? page
    : (parseHttpUrl(head.baseHref, page) ?? page);
}

/** Read discovery from the parsed head. */
export function discoverOEmbed(head: HtmlHead, base: URL): URL | undefined {
  const linkBase = documentBase(head, base);
  for (const attrs of head.links) {
    if (
      attrs.type?.toLowerCase() === "application/json+oembed" &&
      attrs.rel?.toLowerCase().split(/\s+/).includes("alternate")
    ) {
      const href = attrs.href;
      const endpoint = href ? parseHttpUrl(href, linkBase) : undefined;
      if (endpoint) {
        return endpoint;
      }
    }
  }
  return undefined;
}

/** Read link metadata and declared image/icon hints from the parsed head. */
export function fallbackOEmbed(head: HtmlHead, base: URL): OEmbedLink {
  const linkBase = documentBase(head, base);
  const values = new Map<string, string>();
  for (const attributes of head.meta) {
    const key = (attributes.property ?? attributes.name)?.toLowerCase();
    const content = attributes.content?.trim();
    if (key && content && !values.has(key)) {
      values.set(key, content);
    }
  }
  const image = values.get("og:image") ?? values.get("twitter:image");
  // URL data is not prose: resolve nonempty values, never collapse or truncate them.
  const imageUrl = image ? parseHttpUrl(image, linkBase)?.href : undefined;
  const description = normalizeText(
    values.get("og:description") ??
      values.get("twitter:description") ??
      values.get("description") ??
      "",
  );
  const result: OEmbedLink = {
    type: "link",
    version: "1.0",
    title:
      normalizeText(
        values.get("og:title") ??
          values.get("twitter:title") ??
          head.title ??
          "",
      ) || base.hostname,
    provider_name:
      normalizeText(values.get("og:site_name") ?? "") || base.hostname,
    provider_url: base.origin,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };
  let touchIcon: string | undefined;
  for (const attrs of head.links) {
    const rel = attrs.rel?.toLowerCase().split(/\s+/) ?? [];
    const href = attrs.href;
    const icon = href ? parseHttpUrl(href, linkBase)?.href : undefined;
    if (icon && rel.includes("icon")) {
      result.icon_url = icon;
      break;
    }
    if (icon && rel.includes("apple-touch-icon") && !touchIcon) {
      touchIcon = icon;
    }
  }
  const logo = values.get("og:logo");
  const fallbackIcon =
    touchIcon ?? (logo ? parseHttpUrl(logo, linkBase)?.href : undefined);
  if (!result.icon_url && fallbackIcon) {
    result.icon_url = fallbackIcon;
  }
  const width = Number(values.get("og:image:width"));
  const height = Number(values.get("og:image:height"));
  if (imageUrl && dimension(width) && dimension(height)) {
    result.thumbnail_url = imageUrl;
    result.thumbnail_width = width;
    result.thumbnail_height = height;
  }
  return result;
}
