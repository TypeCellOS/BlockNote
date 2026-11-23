import { describe, expect } from "vite-plus/test";
import { blocksToYDoc, yDocToBlocks } from "../utils.js";

describe("empty-doc collaborative binding", () => {
  it("seeds an empty Y.Doc from an empty block array", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const seed = blocksToYDoc(editor, [], "doc");
    onTestFinished(() => seed.destroy());
    expect(yDocToBlocks(editor, seed, "doc")).toEqual([]);
  });
});
