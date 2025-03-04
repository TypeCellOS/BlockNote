export async function getImageDimensions(blob: Blob) {
  if (typeof window !== "undefined" && import.meta.env.NODE_ENV !== "test") {
    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;
    bmp.close(); // free memory
    return { width, height };
  } else {
    // node or vitest
    const imageMetaFunc = (await import("image-meta")).imageMeta;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const meta = imageMetaFunc(bytes);
    return { width: meta.width, height: meta.height };
  }
}
