export async function loadFileDataUrl(
  requireUrl: { default: string },
  mimeType: string
) {
  if (import.meta.env.NODE_ENV === "test") {
    // in vitest, this is the url we need to load with readfilesync
    // eslint-disable-next-line
    const fs = require("fs");
    const buffer = fs.readFileSync("." + requireUrl.default);
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

/**
 * usage:
 * 
 *  await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Italic.ttf")
    );
 */
