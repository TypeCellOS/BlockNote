/**
 * Tells if a media element (`<img>`, `<video>`, `<audio>` or `<embed>`) has no
 * source. Such an element shows nothing, so the parse gives no block for it.
 */
export function isEmptyMediaElement(element: HTMLElement) {
  return (
    !element.getAttribute("src") &&
    // BlockNote's own HTML also has the URL in `data-url`.
    !element.getAttribute("data-url") &&
    // A `<video>` or an `<audio>` can have its source in a `<source>` child.
    !element.querySelector("source[src]")
  );
}
