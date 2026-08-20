import { describe, expect, it } from "vite-plus/test";

import {
  createCIDImageDelivery,
  dataURLImageDelivery,
} from "./imageDelivery.js";

// Base64 "AAAA" = three zero bytes.
const pngImage = {
  mimeType: "image/png",
  data: new Uint8Array([0, 0, 0]),
  width: 100,
  height: 50,
};

describe("dataURLImageDelivery", () => {
  it("encodes the image as a data URL src", () => {
    expect(dataURLImageDelivery.deliver({ ...pngImage, name: "math" })).toBe(
      "data:image/png;base64,AAAA",
    );
  });
});

describe("createCIDImageDelivery", () => {
  it("collects base64 attachments and returns cid: srcs", () => {
    const delivery = createCIDImageDelivery();

    const src = delivery.deliver({ ...pngImage, name: "math" });

    expect(src).toBe("cid:math-1@blocknote");
    expect(delivery.attachments).toEqual([
      {
        cid: "math-1@blocknote",
        filename: "math-1.png",
        content: "AAAA",
        encoding: "base64",
        contentType: "image/png",
        contentDisposition: "inline",
      },
    ]);
  });

  it("numbers multiple images to keep CIDs and filenames unique", () => {
    const delivery = createCIDImageDelivery();

    delivery.deliver({ ...pngImage, name: "math" });
    const second = delivery.deliver({ ...pngImage, name: "diagram" });

    expect(second).toBe("cid:diagram-2@blocknote");
    expect(delivery.attachments[1].filename).toBe("diagram-2.png");
  });

  it("converts SVG images, including non-Latin-1 characters", () => {
    // MathJax SVG output can contain characters outside Latin-1 (which a
    // naive `btoa` rejects); the byte-based contract must round-trip them.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><title>e^{iπ} + 1 = 0</title></svg>`;
    const delivery = createCIDImageDelivery();

    const src = delivery.deliver({
      mimeType: "image/svg+xml",
      data: new TextEncoder().encode(svg),
      width: 100,
      height: 20,
      name: "math",
    });

    expect(src).toBe("cid:math-1@blocknote");
    const attachment = delivery.attachments[0];
    expect(attachment.contentType).toBe("image/svg+xml");
    expect(attachment.filename).toBe("math-1.svg");
    // The attachment round-trips back to the original SVG.
    const bytes = Uint8Array.from(atob(attachment.content), (char) =>
      char.charCodeAt(0),
    );
    expect(new TextDecoder().decode(bytes)).toBe(svg);
  });
});
