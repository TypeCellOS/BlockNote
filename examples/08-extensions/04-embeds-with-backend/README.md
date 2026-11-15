# Embeds with a backend

The same minimal paste-and-choose flow as [the browser-only example](../03-embeds-without-backend), with a standard oEmbed endpoint for saved bookmark metadata and optional live generic previews. No request starts until Bookmark or Embed is chosen.

Run the playground and open `/extensions/embeds-with-backend`; its existing local-development resolver is connected automatically. For a standalone app, set `VITE_OEMBED_URL=https://your-app.example/oembed` in the serving Vite application's `.env.local` and restart it. Without an endpoint, direct providers and useful URL-only fallbacks still work.

The default client accepts raw oEmbed 1.0 JSON, including the existing `@blocknote/xl-embed-server` metadata extensions. Save bookmark metadata once through the small typed callback; mount and reload do not resolve it again. Live providers own their loading and rendering.

An oEmbed response is untrusted data, not authorization to run HTML. Generic iframe rendering is denied unless its exact HTTPS origin is explicitly approved; same-origin application frames are always denied. Unsupported rich HTML becomes a source/metadata card. No upstream scripts or HTML are inserted.

The existing reference server requires application-supplied protected outbound fetching: plain global fetch is not an SSRF-safe server transport. Authentication, CORS, rate limits and deployment remain application-owned. Keep secrets on the server. This example does not persist documents across reloads.
