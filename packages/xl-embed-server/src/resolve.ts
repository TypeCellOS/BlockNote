import { discoverOEmbed, fallbackOEmbed } from "./metadata.js";
import { fetchResource } from "./network.js";
import { validateOEmbed } from "./oembed.js";
import type { EmbedResolverOptions, OEmbedResponse } from "./types.js";

function parseOEmbed(text: string): OEmbedResponse | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
  return validateOEmbed(value);
}

/** Enrichment is optional: a failed provider never discards usable page metadata. */
export async function resolveSource(
  original: string | URL,
  limits: { maxwidth?: string; maxheight?: string },
  options: EmbedResolverOptions,
  signal: AbortSignal,
): Promise<OEmbedResponse> {
  const fallback: OEmbedResponse = {
    type: "link",
    version: "1.0",
    title: String(original),
  };
  const page = await fetchResource(original, options, signal);
  if (!page) {
    return fallback;
  }
  if (page.kind === "json") {
    return parseOEmbed(page.text) ?? fallback;
  }
  const metadata = fallbackOEmbed(page.head, page.url);
  const endpoint = discoverOEmbed(page.head, page.url);
  if (!endpoint) {
    return metadata;
  }
  if (!endpoint.searchParams.has("url")) {
    endpoint.searchParams.set("url", String(original));
  }
  endpoint.searchParams.set("format", "json");
  for (const key of ["maxwidth", "maxheight"] as const) {
    if (limits[key] !== undefined) {
      endpoint.searchParams.set(key, String(limits[key]));
    }
  }
  const provider = await fetchResource(endpoint, options, signal);
  const resolved =
    provider?.kind === "json" ? parseOEmbed(provider.text) : undefined;
  if (!resolved) {
    return metadata;
  }
  // Discovery enriches the page; sparse oEmbed data must not erase its preview.
  // Keep media and thumbnail fields together rather than mixing dimensions from
  // the page's image with a different provider-supplied thumbnail.
  return {
    ...resolved,
    title: resolved.title ?? metadata.title,
    description: resolved.description ?? metadata.description,
    image_url: resolved.image_url ?? metadata.image_url,
    icon_url: resolved.icon_url ?? metadata.icon_url,
  };
}
