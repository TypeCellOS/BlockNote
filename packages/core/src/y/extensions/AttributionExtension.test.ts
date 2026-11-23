import { describe, expect, vi } from "vite-plus/test";
import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { installHeadlessPlugins } from "../../extensions/testHeadlessEditor.js";
import type { User } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";

async function createAttributionEditor(setupEditor: SetupEditor) {
  const resolveUsers = vi.fn(async (ids: string[]): Promise<User[]> =>
    ids.map((id) => ({ id, username: `name-${id}`, avatarUrl: "" })),
  );
  const { editor } = await setupEditor({
    initialContent: [{ type: "paragraph", content: "hello" }],
    extensions: [AttributionExtension({ resolveUsers })],
  });
  installHeadlessPlugins(editor);
  return { editor, resolveUsers };
}

function addMarks(
  editor: BlockNoteEditor,
  author: string,
  kinds: readonly string[],
  range?: { from: number; to: number },
) {
  editor.transact((tr) => {
    tr.doc.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }
      for (const kind of kinds) {
        tr.addMark(
          range?.from ?? pos,
          range?.to ?? pos + node.nodeSize,
          editor.pmSchema.marks[kind].create({
            userIds: [author],
            ...(kind === "y-attributed-format"
              ? { format: { bold: [author] } }
              : {}),
          }),
        );
      }
      return false;
    });
  });
}

describe("AttributionExtension user loading", () => {
  it("loads the authors when an attribution mark is added by a change", async ({
    setupEditor,
  }) => {
    const { editor, resolveUsers } = await createAttributionEditor(setupEditor);
    addMarks(editor, "alice", ["y-attributed-insert"]);

    expect(resolveUsers).toHaveBeenCalledExactlyOnceWith(
      ["alice"],
      expect.anything(),
    );
  });

  it("replaces attribution authors while allowing different attribution kinds to coexist", async ({
    setupEditor,
  }) => {
    const { editor } = await createAttributionEditor(setupEditor);
    const kinds = [
      "y-attributed-insert",
      "y-attributed-delete",
      "y-attributed-format",
    ];
    for (const author of ["alice", "bob"]) {
      addMarks(editor, author, kinds);
    }
    editor.transact(({ doc }) => {
      const marks = doc.firstChild?.firstChild?.firstChild?.firstChild?.marks;
      expect(marks).toHaveLength(3);
      expect(marks?.map((mark) => mark.type.name).sort()).toEqual(
        [...kinds].sort(),
      );
      expect(marks?.map((mark) => mark.attrs.userIds)).toEqual([
        ["bob"],
        ["bob"],
        ["bob"],
      ]);
      expect(
        marks?.find((mark) => mark.type.name === "y-attributed-format")?.attrs
          .format,
      ).toEqual({ bold: ["bob"] });
    });
  });

  it("does not load users for changes without attribution marks", async ({
    setupEditor,
  }) => {
    const { editor, resolveUsers } = await createAttributionEditor(setupEditor);
    editor.replaceBlocks(editor.document, [{ content: "hello world" }]);

    expect(resolveUsers).not.toHaveBeenCalled();
  });

  it("only requests each uncached author once across changes", async ({
    setupEditor,
  }) => {
    const { editor, resolveUsers } = await createAttributionEditor(setupEditor);
    const markedText = () =>
      editor.transact(({ doc }) => {
        const text: string[] = [];
        doc.descendants((node) => {
          if (
            node.isText &&
            node.marks.some(
              (mark) =>
                mark.type.name === "y-attributed-insert" &&
                mark.attrs.userIds.includes("alice"),
            )
          ) {
            text.push(node.text!);
          }
        });
        return text;
      });
    addMarks(editor, "alice", ["y-attributed-insert"], { from: 3, to: 4 });
    expect(markedText()).toEqual(["h"]);
    addMarks(editor, "alice", ["y-attributed-insert"], { from: 5, to: 6 });
    expect(markedText()).toEqual(["h", "l"]);

    expect(resolveUsers).toHaveBeenCalledTimes(1);
  });
});
