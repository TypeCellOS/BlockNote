import { SafeIframe } from "../SafeIframe.js";
import { SourceCard } from "../components.js";
import type { EmbedProvider, EmbedViewProps } from "../types.js";
import { parseSourceUrl } from "../url.js";

export function youtubeVideoId(url: URL): string | undefined {
  const host = url.hostname;
  const id =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : /^\/(?:shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1]
        : undefined;
  return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}
function YouTube({ url }: EmbedViewProps) {
  const source = parseSourceUrl(url);
  const id = source && youtubeVideoId(source);
  return id ? (
    <SafeIframe
      src={`https://www.youtube-nocookie.com/embed/${id}`}
      title="YouTube video"
      // YouTube requires client identification (HTTP Referer) to avoid error 153.
      // Send the application origin, never the editor/document path.
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    />
  ) : (
    <SourceCard url={url} unavailable />
  );
}
export const youtubeProvider: EmbedProvider = {
  id: "youtube",
  matches(url) {
    return !!youtubeVideoId(url);
  },
  component: YouTube,
};
