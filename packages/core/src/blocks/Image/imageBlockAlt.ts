/**
 * Shown when an image has no user-provided name and its URL has no file name.
 * Display only — never written back into `props.name`.
 */
export const IMAGE_BLOCK_ALT_FALLBACK = "Broken image";

/**
 * Alt text for an image block's `<img>` in the editor.
 *
 * Uses `name` when the user set one. Otherwise the URL's file name, so a
 * failed load still identifies the missing image. `data:` and `blob:` URLs
 * have no file name, and an empty URL falls through to
 * {@link IMAGE_BLOCK_ALT_FALLBACK}.
 *
 * Callers must not store the result in `props.name`. Saving would then be
 * unable to tell a name the user typed from one the editor invented, and
 * HTML parse copies `alt` back into `name`.
 */
export function imageBlockAlt(name: string, url: string): string {
  if (name.trim() !== "") {
    return name;
  }

  const basename = fileNameFromUrl(url);
  if (basename !== undefined) {
    return basename;
  }

  return IMAGE_BLOCK_ALT_FALLBACK;
}

function fileNameFromUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (trimmed === "") {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://blocknote.invalid");
  } catch {
    return undefined;
  }

  // These schemes carry no path segment a reader would recognize as a file.
  if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
    return undefined;
  }

  const segment = parsed.pathname
    .split("/")
    .filter((part) => part !== "")
    .at(-1);
  if (segment === undefined) {
    return undefined;
  }

  const decoded = decodePathSegment(segment).trim();
  if (decoded === "" || decoded === "." || decoded === "..") {
    return undefined;
  }

  return decoded;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
