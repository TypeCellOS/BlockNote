/**
 * Completes partial HTML by parsing and correcting incomplete tags.
 * Examples:
 * <p>hello -> <p>hello</p>
 * <p>hello <sp -> <p>hello </p>
 * <p>hello <span -> <p>hello </p>
 * <p>hello <span> -> <p>hello <span></span></p>
 * <p>hello <span>world -> <p>hello <span>world</span></p>
 * <p>hello <span>world</span> -> <p>hello <span>world</span></p>
 *
 * @param html A potentially incomplete HTML string
 * @returns A properly formed HTML string with all tags closed
 */
export function getPartialHTML(html: string): string | undefined {
  // Simple check: if the last '<' doesn't have a matching '>',
  // then we have an incomplete tag at the end
  const lastOpenBracket = html.lastIndexOf("<");
  const lastCloseBracket = html.lastIndexOf(">");

  // Handle incomplete tags by removing everything after the last complete tag
  let htmlToProcess = html;
  if (lastOpenBracket > lastCloseBracket) {
    htmlToProcess = html.substring(0, lastOpenBracket);
    // If nothing remains after removing the incomplete tag, return empty string
    if (!htmlToProcess.trim()) {
      return undefined;
    }
  }

  // if we're half-way through an entity tag that isn't closed, we need to remove the entity tag
  const match = htmlToProcess.match(/&[a-zA-Z0-9]*$/);
  if (match) {
    htmlToProcess = htmlToProcess.substring(
      0,
      htmlToProcess.length - match[0].length,
    );
  }

  // Parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div>${htmlToProcess}</div>`,
    "text/html",
  );
  const el = doc.body.firstChild as HTMLElement;
  return el ? el.innerHTML : "";
}
