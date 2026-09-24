/**
 *
 * Helper functions so that we can import files both on vitest, browser and node
 * TODO: should find a way to test automatically in all environments
 */

export async function loadFileDataUrl(
  requireUrl: { default: string },
  mimeType: string,
) {
  if (import.meta.env.NODE_ENV === "test") {
    const buffer = await loadFileBuffer(requireUrl);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const fileBase64 = buffer.toString("base64");

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    return dataUrl;
  } else {
    // in browser, this is already a data url
    return requireUrl.default as string;
  }
}

export async function loadFontDataUrl(requireUrl: { default: string }) {
  return loadFileDataUrl(requireUrl, "font/ttf");
}

export async function loadFileBuffer(requireUrl: {
  default: string;
}): Promise<Buffer | ArrayBuffer> {
  if (import.meta.env.NODE_ENV === "test") {
    // in vitest, this is the url we need to load with readfilesync
    // eslint-disable-next-line
    const fs = require("fs");
    // Direct paths can contain literal percent sequences. Prefer an existing
    // path, then decode Vite's /@fs and encoded absolute asset URLs.
    const assetPath = requireUrl.default;
    let url = assetPath;
    if (assetPath.startsWith("/@fs/")) {
      url = decodeURIComponent(assetPath.substring("/@fs".length));
    } else if (!fs.existsSync(assetPath)) {
      try {
        url = decodeURIComponent(assetPath);
      } catch {
        // Preserve a malformed percent sequence as a literal filesystem path.
      }
    }
    // On Windows, vite/vitest may yield paths like "/C:/..." after removing /@fs
    // Node on Windows treats paths starting with "/" as relative to current drive,
    // which would produce "C:\C:\...". Strip leading slash when followed by a drive letter.
    if (/^\/[A-Za-z]:/.test(url)) {
      url = url.slice(1);
    }
    const buffer = fs.readFileSync(url);
    return buffer;
  } else {
    // in browser, this is already a data url
    const dataUrl = requireUrl.default as string;
    // convert to buffer on browser
    const response = await fetch(dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
}

/**
 * usage:
 * 
 *  await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Italic.ttf")
    );
 */
