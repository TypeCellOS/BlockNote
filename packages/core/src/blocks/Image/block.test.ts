import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { IMAGE_BLOCK_ALT_FALLBACK, imageBlockAlt } from "./imageBlockAlt.js";

/**
 * Failed image loads are identified by the `<img>` alt text. The fallback is
 * display-only: `props.name` stays whatever the user saved.
 *
 * @vitest-environment jsdom
 */

function renderImage(props: { name?: string; url?: string }) {
  const editor = BlockNoteEditor.create();
  editor.replaceBlocks(editor.document, [
    {
      type: "image",
      props,
    },
  ]);

  const block = editor.document[0];
  if (block.type !== "image") {
    throw new Error("Expected an image block");
  }

  const nameBeforeRender = block.props.name;
  const rendered = editor.schema.blockSpecs.image.implementation.render!(
    block,
    editor,
  );
  const image = rendered.dom.querySelector("img");
  if (!(image instanceof HTMLImageElement)) {
    rendered.destroy?.();
    throw new Error("Expected an img element");
  }

  return { block, image, nameBeforeRender, rendered };
}

describe("imageBlockAlt", () => {
  it("uses the user-provided name", () => {
    expect(
      imageBlockAlt("Diagram of the API", "https://cdn.example.com/a.png"),
    ).toBe("Diagram of the API");
  });

  it("uses the URL file name when name is empty", () => {
    expect(
      imageBlockAlt(
        "",
        "https://cdn.example.com/a/b/missing%20file.png?sig=1#x",
      ),
    ).toBe("missing file.png");
    expect(imageBlockAlt("   ", "images/photo.jpg")).toBe("photo.jpg");
    expect(imageBlockAlt("", "exampleURL")).toBe("exampleURL");
  });

  it("uses a generic label when the URL has no file name", () => {
    expect(imageBlockAlt("", "")).toBe(IMAGE_BLOCK_ALT_FALLBACK);
    expect(imageBlockAlt("", "https://example.com/")).toBe(
      IMAGE_BLOCK_ALT_FALLBACK,
    );
    expect(imageBlockAlt("", "data:image/png;base64,iVBORw0KGgo")).toBe(
      IMAGE_BLOCK_ALT_FALLBACK,
    );
    expect(imageBlockAlt("", "blob:https://example.com/8c1c0b2e-1")).toBe(
      IMAGE_BLOCK_ALT_FALLBACK,
    );
    expect(IMAGE_BLOCK_ALT_FALLBACK).toBe("Broken image");
  });
});

describe("image block render alt", () => {
  it("shows the URL file name and does not store it as the name", () => {
    const { block, image, nameBeforeRender, rendered } = renderImage({
      name: "",
      url: "https://cdn.example.com/photos/missing-photo.png?token=1",
    });

    expect(image.alt).toBe("missing-photo.png");
    expect(image.getAttribute("alt")).toBe("missing-photo.png");
    expect(nameBeforeRender).toBe("");
    expect(block.props.name).toBe("");

    rendered.destroy?.();
  });

  it("keeps a user-provided name", () => {
    const { block, image, rendered } = renderImage({
      name: "Architecture diagram",
      url: "https://cdn.example.com/photos/missing-photo.png",
    });

    expect(image.alt).toBe("Architecture diagram");
    expect(block.props.name).toBe("Architecture diagram");

    rendered.destroy?.();
  });

  it("does not export the display fallback into HTML that parse would save as name", () => {
    const editor = BlockNoteEditor.create();
    const url = "https://cdn.example.com/photos/missing-photo.png";
    const html = editor.blocksToHTMLLossy([
      {
        type: "image",
        props: {
          name: "",
          url,
        },
      },
    ]);

    const exported = new DOMParser().parseFromString(html, "text/html");
    expect(exported.querySelector("img")?.getAttribute("alt")).toBe("");

    expect(editor.tryParseHTMLToBlocks(html)[0]).toMatchObject({
      type: "image",
      props: {
        name: "",
        url,
      },
    });
  });
});
