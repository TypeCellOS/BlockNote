import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  embedBlockSpecs,
  withEmbeds,
  PasteChoice,
  createProvider,
  SafeIframe,
  type EmbedViewProps,
  type ResolveMetadata,
} from "@blocknote/embeds";
import {
  createOEmbedClient,
  metadataFromOEmbed,
} from "@blocknote/embeds/oembed";
import { youtubeProvider } from "@blocknote/embeds/providers/youtube";
import { blueskyProvider } from "@blocknote/embeds/providers/bluesky";
import { createOEmbedProvider } from "@blocknote/embeds/providers/oembed";
import "@blocknote/embeds/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";

const CODEPEN_URL = "https://codepen.io/team/codepen/pen/PNaGbb";

function CodePen({ url }: EmbedViewProps) {
  const source = new URL(url);
  return (
    <SafeIframe
      src={`https://codepen.io${source.pathname.replace("/pen/", "/embed/")}?default-tab=result`}
      title="CodePen example"
      aspectRatio={16 / 10}
    />
  );
}

const codepenProvider = createProvider({
  id: "codepen",
  matches(url) {
    return (
      url.hostname === "codepen.io" &&
      /^\/(?:team\/)?[\w-]+\/pen\/[\w-]+\/?$/.test(url.pathname)
    );
  },
  component: CodePen,
});

const configuredEndpoint: unknown = import.meta.env.VITE_OEMBED_URL;
const playgroundEndpoint: unknown = import.meta.env
  .BLOCKNOTE_EMBED_DEMO_ENDPOINT;
const endpoint = [configuredEndpoint, playgroundEndpoint].find(
  (value): value is string => typeof value === "string" && value.length > 0,
);
const resolve = endpoint ? createOEmbedClient({ endpoint }) : undefined;
const resolveMetadata: ResolveMetadata = async (url, options) => {
  if (!resolve) {
    return { status: "unavailable" };
  }
  const result = await resolve(url, options);
  return result.status === "success"
    ? { status: "success", value: metadataFromOEmbed(result.value) }
    : result;
};
const embeds = {
  providers: [
    youtubeProvider,
    blueskyProvider,
    codepenProvider,
    createOEmbedProvider({
      resolve,
      // Data from an oEmbed service is not permission to execute arbitrary iframe content.
      approvedIframeOrigins: [
        "https://player.vimeo.com",
        "https://www.youtube-nocookie.com",
      ],
    }),
  ],
  resolveMetadata,
};
const schema = BlockNoteSchema.create().extend({
  blockSpecs: embedBlockSpecs,
});
const samples = [
  ["YouTube", "https://www.youtube.com/watch?v=jNQXAC9IVRw"],
  ["Bluesky", "https://bsky.app/profile/bsky.app/post/3kktuiwidw22d"],
  ["CodePen", CODEPEN_URL],
  ["Website", "https://www.blocknotejs.org"],
] as const;

export default function App() {
  const [notice, setNotice] = useState(
    endpoint
      ? "Backend connected: bookmarks save metadata; supported links show live previews."
      : "No backend configured. Set VITE_OEMBED_URL; unsupported embeds show a source link.",
  );
  const editor = useCreateBlockNote(
    withEmbeds({
      schema,
      embeds,
    }),
  );
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setNotice(`Copy manually: ${url}`);
      return;
    }
    const last = editor.document.at(-1);
    if (last) {
      const target =
        last.type === "paragraph" && last.content.length === 0
          ? last
          : editor.insertBlocks([{ type: "paragraph" }], last, "after")[0];
      editor.setTextCursorPosition(target, "end");
    }
    editor.focus();
    setNotice(
      "URL copied. Paste into the empty paragraph to choose URL, Bookmark or Embed.",
    );
  }
  return (
    <>
      <div
        role="group"
        aria-label="Copy sample URL"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}
      >
        {samples.map(([label, url]) => (
          <button
            key={label}
            type="button"
            title={url}
            onClick={() => void copy(url)}
          >
            Copy {label} URL
          </button>
        ))}
        <span role="status">{notice}</span>
      </div>
      <BlockNoteView editor={editor}>
        <PasteChoice />
      </BlockNoteView>
    </>
  );
}
