/**
 * Tells if a media element (`<img>`, `<video>`, `<audio>` or `<embed>`) has no
 * source and no caption. Such an element shows nothing, so the parse gives no
 * block for it.
 */
export function isEmptyMediaElement(element: HTMLElement) {
  return (
    !element.getAttribute("src") &&
    // BlockNote's own HTML also has the URL in `data-url`.
    !element.getAttribute("data-url") &&
    // A `<video>` or an `<audio>` can have its source in a `<source>` child.
    !element.querySelector("source[src]") &&
    // The HTML export writes the caption of a block without a URL here.
    !element.getAttribute("data-caption")
  );
}
