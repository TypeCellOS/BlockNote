# React embeds and bookmarks

```tsx
import { BlockNoteSchema } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { embedBlockSpecs, withEmbeds, PasteChoice } from "@blocknote/embeds";
import { youtubeProvider } from "@blocknote/embeds/providers/youtube";
import { createOEmbedProvider } from "@blocknote/embeds/providers/oembed";
import "@blocknote/embeds/style.css";

// Create once, outside render (or memoize for the editor lifetime).
const embeds = { providers: [youtubeProvider, createOEmbedProvider()] };
const schema = BlockNoteSchema.create().extend({
  blockSpecs: embedBlockSpecs,
});

function Editor() {
  const editor = useCreateBlockNote(withEmbeds({ schema, embeds }));
  return (
    <BlockNoteView editor={editor}>
      <PasteChoice />
    </BlockNoteView>
  );
}
```

Paste one HTTP(S) URL into an empty paragraph: it remains an ordinary link until the user chooses Bookmark or Embed. Single-entry URI lists and HTML-only single links/URL text are also supported; rich, proprietary, multiple-content and file payloads delegate. No preview request, remote image, iframe or provider component is started by the choice menu itself.

`withEmbeds` appends the configured extension, preserves other editor options and removes its `embeds` configuration field. Extend your schema explicitly as above; it must contain the ordinary paragraph, text and link types. Supply an application `pasteHandler` alongside `schema`/`embeds` to compose it: noncandidate pastes return that handler's result unchanged, including `false` or `undefined`. The default handler runs only when no application handler exists; a custom handler can call its typed `defaultPasteHandler` itself.

### Programmatic actions

```tsx
import { EmbedExtension } from "@blocknote/embeds";

const embeds = editor.getExtension(EmbedExtension);
if (embeds) {
  embeds.insertEmbed("https://www.youtube.com/watch?v=jNQXAC9IVRw");
  const outcome = await embeds.insertBookmark(
    "https://example.org",
    targetBlockId,
  );
  if (outcome.status === "url-only") {
    // Saved a useful bookmark without metadata.
  }
  embeds.insertUrl("https://example.org", targetBlockId);
}
```

Actions replace the specified block (or the cursor block captured at invocation), preserving its ID and children. They do not require `PasteChoice`. Outcomes use `status`: `converted`, `url-only`, `unchanged`, `unavailable` (invalid source, missing target/provider or read-only), or `cancelled` (stale bookmark work). Unexpected callback errors reject rather than becoming document text. **Only one bookmark request is active per editor**: every representation action supersedes it, even when the chosen representation is already visible. Moving the caret or dismissing the chooser alone does not cancel it; editing/deleting the target subtree, history changes to that target, read-only transitions and editor unmount do.

Bookmarks resolve once through the optional typed `resolveMetadata(url, {signal})` callback, save scalar title/description/image URL props and never resolve on mount. Return `{status: "success", value: metadata}` or `{status: "unavailable"}`; expected failures still create URL-only bookmarks. Unexpected exceptions propagate. Superseded, edited, deleted, unmounted and read-only targets cannot receive a late result.

Embeds save only `originalUrl` and `providerId`. Providers are opt-in and first-match-wins; place a catch-all last. A custom provider is `{id, matches(url: URL), component: ReactComponent<EmbedViewProps>}`. Its component receives `{url: string}` and owns asynchronous work and custom controls. Keep registration stable for the editor lifetime.

Use `createProvider` for inferred matcher/render props and a preserved literal ID:

```tsx
import { createProvider } from "@blocknote/embeds";

const exampleProvider = createProvider({
  id: "example",
  matches(url) {
    return url.hostname === "example.com";
  },
  component({ url }) {
    return <a href={url}>Custom example preview</a>;
  },
});
```

Register it in `withEmbeds({ schema, embeds: { providers: [exampleProvider] } })`. Rendering stays
entirely in your application; the helper adds no fetching or persisted settings.

Optional entrypoints:

- `providers/youtube`: `youtubeProvider`
- `providers/bluesky`: `blueskyProvider`
- `providers/oembed`: `createOEmbedProvider({resolve?, approvedIframeOrigins?})`
- `oembed`: `createOEmbedClient({endpoint})`, `metadataFromOEmbed`, and standard oEmbed types

Without a resolver the catch-all deliberately shows a useful source card. The optional endpoint client accepts raw standard oEmbed JSON, including `xl-embed-server` metadata extensions. An application can adapt its result to bookmark metadata in a few lines; see the endpoint-backed example.

**oEmbed data does not authorize execution.** Generic iframe rendering is denied by default. Approve exact HTTPS origins explicitly; application-origin iframes and `srcdoc` are denied even then. No upstream HTML/scripts or attributes are inserted. Photos and metadata use validated HTTP(S) resource URLs. Stored remote images can still load when a saved bookmark is displayed.

`SafeIframe` is available to app-owned providers. It accepts a trusted provider URL (not upstream HTML); resize messages require both exact origin and matching iframe window before a provider-specific decoder runs. All static HTML exports are resource-free original source links.

Checks: `vp run test`, `vp run lint`, `vp run build`. Browser tests run only through the repository's focused Docker suite with retries disabled.
