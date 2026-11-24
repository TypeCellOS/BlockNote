/**
 * Tells if a media element (`<img>`, `<video>`, `<audio>` or `<embed>`) has no
 * source. Such an element shows nothing, so the parse gives no block for it.
 */
export function isEmptyMediaElement(element: HTMLElement) {
  // A `<video>` or an `<audio>` can have its source in a `<source>` child.
  return !element.getAttribute("src") && !element.querySelector("source[src]");
}
