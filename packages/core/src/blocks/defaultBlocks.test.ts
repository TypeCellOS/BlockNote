import { Editor, Extension, getSchema, Mark, Node } from "@tiptap/core";
import { describe, expect, it } from "vite-plus/test";
import { CommentMark } from "../comments/mark.js";
import { defaultStyleSpecs } from "./defaultBlocks.js";

const extensions = [
  Node.create({ name: "doc", topNode: true, content: "text*" }),
  Node.create({ name: "text", group: "inline" }),
  ...Object.values(defaultStyleSpecs).map((style) => style.implementation.mark),
];

describe("inline code mark exclusions", () => {
  it.each([false, true])(
    "builds exclusions from enabled marks (comments enabled: %s)",
    (withComments) => {
      const editor = new Editor({
        element: null,
        extensions: [
          ...extensions,
          Extension.create({
            name: "customMarks",
            addExtensions() {
              return [
                Mark.create({ name: "customStyle" }),
                ...(withComments ? [CommentMark] : []),
              ];
            },
          }),
        ],
      });

      try {
        const { marks } = editor.schema;
        const code = marks.code;
        expect(code.spec.excludes).not.toBe("_");
        for (const mark of Object.values(marks)) {
          expect(code.excludes(mark)).toBe(mark.name !== "comment");
        }

        if (withComments) {
          const codeMark = code.create();
          const commentMark = marks.comment.create({ threadId: "thread" });
          expect(codeMark.addToSet([commentMark])).toHaveLength(2);
          expect(commentMark.addToSet([codeMark])).toHaveLength(2);
        }
      } finally {
        editor.destroy();
      }
    },
  );

  it("supports schema creation without an editor", () => {
    const { marks } = getSchema(extensions);
    expect(marks.code.excludes(marks.bold)).toBe(true);
  });
});
