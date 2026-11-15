# Embeds without a backend

Paste a sample URL into an empty paragraph, then choose URL, Bookmark or Embed. Pasting itself only inserts an ordinary link and never fetches a preview.

YouTube, Bluesky and the small typed custom CodePen React provider work directly after you choose Embed. The optional catch-all accepts other websites and honestly shows a source card without a resolver. No backend endpoint, provider catalog or automatic favicon service is used. Bookmarks save only the source URL unless you supply a metadata callback; saved bookmarks never resolve metadata on mount.

Run the playground and open `/extensions/embeds-without-backend`. Compare with [the endpoint-backed example](https://playground.blocknotejs.org/extensions/embeds-with-backend). Copy buttons write plain text and focus an empty paragraph; they do not fetch or insert previews. This example does not persist documents across reloads.
