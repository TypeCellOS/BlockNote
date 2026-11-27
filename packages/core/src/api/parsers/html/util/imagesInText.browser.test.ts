import { describe, expect } from "vite-plus/test";
import { detachedDoc } from "../../../../util/detachedDoc.js";
import { moveImagesOutOfText } from "./imagesInText.js";

describe("moveImagesOutOfText", () => {
  it("splits one paragraph around two images and keeps a trailing image-only mention", () => {
    const mention =
      '<span data-inline-content-type="mention"><img src="avatar.png"></span>';
    const root = detachedDoc().createElement("div");
    root.innerHTML =
      `<p>Before <img src="one.png"> <strong>Between</strong> ` +
      `<img src="two.png"> ${mention}</p>`;

    moveImagesOutOfText(root);

    expect(Array.from(root.children, (child) => child.outerHTML)).toEqual([
      "<p>Before</p>",
      '<img src="one.png">',
      "<p><strong>Between</strong></p>",
      '<img src="two.png">',
      `<p>${mention}</p>`,
    ]);
  });
});
