export async function loadFontDataUrl(requireUrl: { default: string }) {
  if (import.meta.env.NODE_ENV === "test") {
    // in vitest, this is the url we need to load with readfilesync
    // eslint-disable-next-line
    const fs = require("fs");
    const buffer = fs.readFileSync("." + requireUrl.default);
    const fontBase64 = buffer.toString("base64");

    const dataUrl = `data:font/ttf;base64,${fontBase64}`;
    return dataUrl;
  } else {
    // in browser, this is already a data url
    return requireUrl.default as any;
  }
}
