import { describe, expect } from "vite-plus/test";
import { createPlainInlineSchema } from "./createSpec.test.fixture.js";

describe("plain inline content parsing", () => {
  it.for([
    {
      name: "drops formatting marks",
      html: "hello <b>world</b>",
      text: "hello world",
    },
    {
      name: "converts line breaks to newlines",
      html: "first<br>second",
      text: "first\nsecond",
    },
  ])("$name", async ({ html, text }, { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: createPlainInlineSchema(),
    });

    const blocks = editor.tryParseHTMLToBlocks(
      `<p><span class="custom-plain-ic">${html}</span></p>`,
    );

    expect(blocks[0].content).toEqual([
      { type: "customPlainIC", props: {}, content: text },
    ]);
  });
});
