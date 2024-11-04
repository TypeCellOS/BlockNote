import type Sharp from "sharp";

export async function getImageDimensions(blob: Blob) {
  if (typeof window !== "undefined" && import.meta.env.NODE_ENV !== "test") {
    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;
    bmp.close(); // free memory
    return { width, height };
  } else {
    // node or vitest
    const sharp = (await require("sharp")) as typeof Sharp;
    const buffer = await blob.arrayBuffer();

    // const buffer2 = Buffer.from(buffer); for jsdom, currently disabled
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Image has no width or height");
    }
    return { width: metadata.width, height: metadata.height };
  }
}
