import { EditorState, Selection } from "@tiptap/pm/state";
import { expect, vi } from "vite-plus/test";

import { blockToNode } from "../../../api/nodeConversions/blockToNode.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

it("keeps tail numbering without resolving absolute positions for predecessors", async ({
  setupEditor,
}) => {
  const tailLength = 32;
  const { editor } = await setupEditor({
    initialContent: [
      { type: "numberedListItem", content: "previous list" },
      { type: "paragraph", content: "list break" },
      { type: "numberedListItem", props: { start: 7 }, content: "start" },
      ...Array.from({ length: tailLength }, () => ({
        type: "numberedListItem" as const,
        content: "item",
      })),
    ],
  });
  const doc = editor.pmSchema.topNodeType.createChecked(
    null,
    editor.pmSchema.nodes["blockGroup"].createChecked(
      null,
      editor.document.map((block) => blockToNode(block, editor.pmSchema)),
    ),
  );
  const plugin = NumberedListIndexingDecorationPlugin();
  const state = EditorState.create({
    doc,
    selection: Selection.atEnd(doc),
    plugins: [plugin],
  });
  const tr = state.tr.insertText("x");
  expect(tr.selection.$from.parent.type.name).toBe("numberedListItem");
  expect(tr.selection.$from.parent.textContent).toBe("itemx");

  // Observe state application, not the resolutions needed to construct the edit.
  const resolve = vi.spyOn(tr.doc, "resolve");
  try {
    const nextState = state.apply(tr);
    expect(
      plugin
        .getState(nextState)
        ?.decorations.find()
        .map((decoration) => decoration.spec.index),
    ).toEqual([1, ...Array.from({ length: tailLength + 1 }, (_, i) => 7 + i)]);
    expect(resolve).not.toHaveBeenCalled();
  } finally {
    resolve.mockRestore();
  }
});
