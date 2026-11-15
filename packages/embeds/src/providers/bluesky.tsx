import { useEmbedResource } from "../useEmbedResource.js";
import { useBlockNoteContext } from "@blocknote/react";
import { SafeIframe } from "../SafeIframe.js";
import { SourceCard } from "../components.js";
import type { EmbedProvider, EmbedViewProps, ResolveResult } from "../types.js";
import { parseSourceUrl } from "../url.js";
import { fetchJson } from "../fetchJson.js";

function postParts(url: URL) {
  if (url.hostname !== "bsky.app") {
    return undefined;
  }
  const match = /^\/profile\/([^/]+)\/post\/([a-zA-Z0-9]+)\/?$/.exec(
    url.pathname,
  );
  return match ? { actor: match[1], post: match[2] } : undefined;
}
/** AT Protocol permits production hostname-only did:web and 24-character base32 PLC IDs.
 * https://atproto.com/specs/did / https://web.plc.directory/spec/v0.1/did-plc */
function isSupportedDid(value: string) {
  if (/^did:plc:[a-z2-7]{24}$/.test(value)) {
    return true;
  }
  if (!value.startsWith("did:web:")) {
    return false;
  }
  const host = value.slice("did:web:".length);
  return (
    host.length <= 253 &&
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(
      host,
    ) &&
    ![
      "alt",
      "arpa",
      "example",
      "internal",
      "invalid",
      "local",
      "localhost",
      "onion",
      "test",
    ].includes(host.slice(host.lastIndexOf(".") + 1).toLowerCase())
  );
}
async function resolveDid(
  actor: string,
  signal: AbortSignal,
): Promise<ResolveResult<string>> {
  if (isSupportedDid(actor)) {
    return { status: "success", value: actor };
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(actor)) {
    return { status: "unavailable" };
  }
  const result = await fetchJson(
    new Request(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
      { signal, credentials: "omit" },
    ),
  );
  if (result.status === "unavailable") {
    return result;
  }
  const value = result.value;
  return typeof value === "object" &&
    value !== null &&
    "did" in value &&
    typeof value.did === "string" &&
    isSupportedDid(value.did)
    ? { status: "success", value: value.did }
    : { status: "unavailable" };
}
function decodeHeight(data: unknown) {
  return typeof data === "object" &&
    data !== null &&
    "height" in data &&
    typeof data.height === "number"
    ? data.height
    : undefined;
}
async function resolvePost(
  url: string,
  { signal }: { signal: AbortSignal },
): Promise<ResolveResult<string>> {
  const source = parseSourceUrl(url);
  const parts = source && postParts(source);
  if (!parts) {
    return { status: "unavailable" };
  }
  const result = await resolveDid(parts.actor, signal);
  return result.status === "success"
    ? {
        status: "success",
        value: `https://embed.bsky.app/embed/${result.value}/app.bsky.feed.post/${parts.post}`,
      }
    : { status: "unavailable" };
}
function Bluesky({ url }: EmbedViewProps) {
  const colorMode = useBlockNoteContext()?.colorSchemePreference ?? "light";
  const state = useEmbedResource(url, resolvePost);
  switch (state.status) {
    case "loading":
      return (
        <div className="bn-embed-loading">
          <span role="status">Loading embed…</span>
          <SourceCard url={url} />
        </div>
      );
    case "unavailable":
      return <SourceCard url={url} unavailable />;
    case "success":
      return (
        // Bluesky themes the post via colorMode, but its transparent document
        // still uses the default light canvas scheme. Match that at the iframe
        // boundary, otherwise browsers paint its transparent perimeter white.
        <div style={{ colorScheme: "light" }}>
          <SafeIframe
            src={`${state.value}?colorMode=${colorMode}`}
            title="Bluesky post"
            aspectRatio={1}
            decodeHeight={decodeHeight}
          />
        </div>
      );
  }
}
export const blueskyProvider: EmbedProvider = {
  id: "bluesky",
  matches(url) {
    return !!postParts(url);
  },
  component: Bluesky,
};
