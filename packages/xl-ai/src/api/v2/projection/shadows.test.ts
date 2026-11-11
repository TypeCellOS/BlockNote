import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { richSchema } from "../testUtil/richRandom.js";
import { shadowOf } from "./shadows.js";

describe("shadowOf", () => {
  const editor = BlockNoteEditor.create({ schema: richSchema });
  const mention = { type: "mention", props: { user: "Bob" } };

  it("gives the text that markdown shows for a mention", () => {
    expect(shadowOf(editor, markdownFormat, mention)).toBe("@Bob");
  });

  it("gives no shadow for an item that the parse gives back", () => {
    expect(
      shadowOf(editor, markdownFormat, {
        type: "text",
        text: "plain",
        styles: { bold: true },
      }),
    ).toBeUndefined();
  });

  it("gives no shadow if the format keeps the item", () => {
    // HTML keeps the mention as an element with its props.
    expect(shadowOf(editor, htmlFormat, mention)).toBeUndefined();
  });
});
