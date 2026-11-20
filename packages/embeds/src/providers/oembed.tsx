import { useState } from "react";
import { useEmbedResource } from "../useEmbedResource.js";
import { SafeIframe } from "../SafeIframe.js";
import { SourceCard } from "../components.js";
import {
  metadataFromOEmbed,
  type OEmbedResponse,
  type ResolveOEmbed,
} from "../oembed.js";
import type { EmbedProvider, EmbedViewProps } from "../types.js";
import { parseSourceUrl } from "../url.js";

export type OEmbedProviderOptions = {
  resolve?: ResolveOEmbed;
  /** Exact HTTPS origins only. Empty by default: oEmbed data does not grant execution permission. */
  approvedIframeOrigins?: readonly string[];
};

export function approvedIframeSource(
  html: string,
  origins: readonly string[],
  appOrigin: string,
): string | undefined {
  // Template contents stay inert, including images/scripts: never insert this DOM into the document.
  const template = document.createElement("template");
  template.innerHTML = html;
  const frames = template.content.querySelectorAll("iframe");
  if (frames.length !== 1) {
    return undefined;
  }
  const frame = frames[0];
  if (frame.hasAttribute("srcdoc")) {
    return undefined;
  }
  const source = frame.getAttribute("src");
  const url = source && parseSourceUrl(source);
  return url &&
    url.protocol === "https:" &&
    url.origin !== appOrigin &&
    origins.includes(url.origin)
    ? (source ?? undefined)
    : undefined;
}

function Media({
  value,
  url,
  origins,
}: {
  value: OEmbedResponse;
  url: string;
  origins: readonly string[];
}) {
  const [brokenPhoto, setBrokenPhoto] = useState(false);
  if (value.type === "photo" && parseSourceUrl(value.url) && !brokenPhoto) {
    return (
      <img
        className="bn-embed-photo"
        src={value.url}
        alt={value.title ?? ""}
        referrerPolicy="no-referrer"
        onError={() => setBrokenPhoto(true)}
      />
    );
  }
  if (
    (value.type === "video" || value.type === "rich") &&
    typeof document !== "undefined"
  ) {
    const src = approvedIframeSource(
      value.html,
      origins,
      window.location.origin,
    );
    if (src) {
      return (
        <SafeIframe
          src={src}
          title={value.title || "Embedded content"}
          aspectRatio={
            value.width > 0 && value.height > 0
              ? value.width / value.height
              : 16 / 9
          }
        />
      );
    }
  }
  return <SourceCard url={url} metadata={metadataFromOEmbed(value)} />;
}

/** Register last. Without a resolver this deliberately provides an honest URL-card fallback. */
export function createOEmbedProvider({
  resolve,
  approvedIframeOrigins = [],
}: OEmbedProviderOptions = {}): EmbedProvider {
  const origins = [...approvedIframeOrigins];
  function OEmbed({ url }: EmbedViewProps) {
    const state = useEmbedResource(url, resolve);
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
        return <Media value={state.value} url={url} origins={origins} />;
    }
  }
  return {
    id: "oembed",
    matches() {
      return true;
    },
    component: OEmbed,
  };
}
