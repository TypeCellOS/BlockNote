/**
 * Decodes a data URL image and samples its pixels, so browser tests can
 * assert generated images actually contain ink rather than being
 * valid-but-blank - and that the ink covers the image rather than sitting
 * letterboxed in a corner of it (`inkedFractionX`/`inkedFractionY` are the
 * fractions of the width/height the inked bounding box spans). Browser-only
 * (needs image decoding and a canvas).
 */
export async function decodeAndSample(dataURL: string): Promise<{
  width: number;
  height: number;
  inkedPixels: number;
  inkedFractionX: number;
  inkedFractionY: number;
}> {
  const image = new Image();
  image.src = dataURL;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context unavailable for decoding images");
  }
  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let inkedPixels = 0;
  let minX = canvas.width;
  let maxX = -1;
  let minY = canvas.height;
  let maxY = -1;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) {
      inkedPixels++;
      const pixelIndex = (i - 3) / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    width: canvas.width,
    height: canvas.height,
    inkedPixels,
    inkedFractionX: maxX < minX ? 0 : (maxX - minX + 1) / canvas.width,
    inkedFractionY: maxY < minY ? 0 : (maxY - minY + 1) / canvas.height,
  };
}
