/**
 *
 * Helper functions so that we can import files both on vitest, browser and node
 * TODO: should find a way to test automatically in all environments
 */

export async function loadFileDataUrl(
  requireUrl: { default: string },
  mimeType: string
) {
  if (import.meta.env.NODE_ENV === "test") {
    const buffer = await loadFileBuffer(requireUrl);
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
    let url = requireUrl.default;

    if (url.startsWith("/@fs/")) {
      url = url.substring("/@fs".length);
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
