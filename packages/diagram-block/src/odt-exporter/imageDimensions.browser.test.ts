import { getImageDimensions } from "@shared/util/imageUtil.js";
import { expect, it, vi } from "vite-plus/test";

it("reads SVG dimensions without bitmap decoding", async () => {
  const decodeBitmap = vi.spyOn(window, "createImageBitmap");
  vi.stubEnv("NODE_ENV", "production");
  try {
    // Positive control: a real raster image must take the bitmap path in
    // this environment; otherwise the SVG bypass assertion proves nothing.
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 3;
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode test PNG")),
      );
    });
    await expect(getImageDimensions(png)).resolves.toEqual({
      width: 2,
      height: 3,
    });
    expect(decodeBitmap).toHaveBeenCalledExactlyOnceWith(png);

    const svg = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"/>'],
      { type: "image/svg+xml" },
    );
    await expect(getImageDimensions(svg)).resolves.toEqual({
      width: 100,
      height: 50,
    });
    expect(decodeBitmap).toHaveBeenCalledTimes(1);
  } finally {
    decodeBitmap.mockRestore();
    vi.unstubAllEnvs();
  }
});
