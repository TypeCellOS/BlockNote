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
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Image has no width or height");
    }
    return { width: metadata.width, height: metadata.height };
  }
}
