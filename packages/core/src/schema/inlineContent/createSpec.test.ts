import { describe, expect } from "vite-plus/test";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
import { createPlainInlineSchema } from "./createSpec.test.fixture.js";

describe("plain inline content", () => {
  it.for(["hello world", "first\nsecond"])(
    "keeps %j as a string in the block model",
    async (content, { setupEditor }) => {
      const { editor } = await setupEditor({
        schema: createPlainInlineSchema(),
      });

      // Plain content keeps newlines as characters rather than hardBreak nodes.
      editor.replaceBlocks(editor.document, [
        {
          type: "paragraph",
          content: [{ type: "customPlainIC", props: {}, content }],
        },
      ]);

      expect(editor.document[0].content).toEqual([
        { type: "customPlainIC", props: {}, content },
      ]);
    },
  );

  it("disallows formatting marks but allows annotation marks", async ({
    setupEditor,
  }) => {
    // Checked at the ProseMirror level because the block model intentionally
    // represents plain content as a bare string, without marks.
    //
    // Every non-formatting mark comes from an optional extension. The Yjs
    // attribution marks are the ones reachable from core, so they stand in for
    // the `"annotation"` group here; register them so the group is non-empty
    // (mirroring the "plain" block test).
    const { editor } = await setupEditor({
      schema: createPlainInlineSchema(),
      extensions: [YAttributionMarksExtension()],
    });

    const plainType = editor.pmSchema.nodes["customPlainIC"];
    const insertMark = editor.pmSchema.marks["y-attributed-insert"];
    const boldMark = editor.pmSchema.marks["bold"];

    // The plain inline content allows the non-formatting mark but not the
    // formatting one.
    expect(plainType.allowsMarkType(insertMark)).toBe(true);
    expect(plainType.allowsMarkType(boldMark)).toBe(false);

    // ...and so `allowedMarks` keeps the former while dropping the latter.
    const markNames = new Set(
      plainType
        .allowedMarks([
          insertMark.create({ userIds: ["test-user"] }),
          boldMark.create(),
        ])
        .map((m) => m.type.name),
    );
    expect(markNames.has("y-attributed-insert")).toBe(true);
    expect(markNames.has("bold")).toBe(false);
  });
});
