import { describe, expect } from "vite-plus/test";

import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { richSchema } from "../testUtil/richRandom.js";
import { shadowOf } from "./shadows.js";

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)({
      schema: richSchema,
    });
    return editor;
  },
);

describe("shadowOf", () => {
  const mention = { type: "mention", props: { user: "Bob" } };

  it("gives the text that markdown shows for a mention", ({ editor }) => {
    expect(shadowOf(editor, markdownFormat, mention)).toBe("@Bob");
  });

  it("gives no shadow for an item that the parse gives back", ({ editor }) => {
    expect(
      shadowOf(editor, markdownFormat, {
        type: "text",
        text: "plain",
        styles: { bold: true },
      }),
    ).toBeUndefined();
  });

  it("gives no shadow if the format keeps the item", ({ editor }) => {
    // HTML keeps the mention as an element with its props.
    expect(shadowOf(editor, htmlFormat, mention)).toBeUndefined();
  });
});
