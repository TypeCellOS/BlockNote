/**
 * Gives the URL of a media element (`<img>`, `<video>`, `<audio>` or
 * `<embed>`), or `undefined` if it has none. The parse gives no block for a
 * media element without a URL.
 */
export function parseMediaUrl(
  element:
    | HTMLImageElement
    | HTMLVideoElement
    | HTMLAudioElement
    | HTMLEmbedElement,
): string | undefined {
  // BlockNote's own HTML has the URL in `data-url`, on the figure of the
  // element or on the element. The generic parse of the props reads that
  // attribute after the parse of the block, so it has priority here too.
  const dataUrl =
    element.closest("figure")?.getAttribute("data-url") ??
    element.getAttribute("data-url");
  if (dataUrl !== null) {
    return dataUrl.trim() ? dataUrl : undefined;
  }

  // A `<video>` or an `<audio>` can have its URL in a `<source>` child.
  for (const source of [element, ...element.querySelectorAll("source")]) {
    // The attribute tells if there is a URL: in the active document, the
    // `src` property of an empty `src` attribute is the URL of the page.
    if (source.getAttribute("src")?.trim()) {
      return source.src;
    }
  }

  return undefined;
}
