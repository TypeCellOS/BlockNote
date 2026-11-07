import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { richSchema } from "../testUtil/richRandom.js";
import { shadowsOf } from "./shadows.js";

describe("shadowsOf", () => {
  const editor = BlockNoteEditor.create({ schema: richSchema });
  const mention = { type: "mention", props: { user: "Bob" } };

  it("gives the text that markdown shows for a mention", () => {
    expect(shadowsOf(editor, markdownFormat)(mention)).toBe("@Bob");
  });

  it("gives no shadow for an item that the parse gives back", () => {
    const shadowOf = shadowsOf(editor, markdownFormat);
    expect(
      shadowOf({ type: "text", text: "plain", styles: { bold: true } }),
    ).toBeUndefined();
  });

  it("gives no shadow if the format keeps the item", () => {
    // HTML keeps the mention as an element with its props.
    expect(shadowsOf(editor, htmlFormat)(mention)).toBeUndefined();
  });
});
