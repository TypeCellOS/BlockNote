export function loadFontDataUrl(path: string) {
  // @ts-ignore
  const fs = require("fs");
  const buffer = fs.readFileSync(path);
  const fontBase64 = buffer.toString("base64");

  const dataUrl = `data:font/ttf;base64,${fontBase64}`;
  return dataUrl;
}
