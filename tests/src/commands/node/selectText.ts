import { type BlockNoteEditor, getNodeById } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";

/**
 * Selects the first exact substring in document order, including text split across
 * different marks, without crossing blocks or non-text inline nodes. Use to set up
 * a component's selection-dependent state or formatting action without repeating
 * unrelated keyboard navigation. Use real keyboard/pointer input instead when
 * selection gestures or keyboard navigation are the behavior under test.
 *
 * Does not focus the editor. Restrict duplicate text with an inclusive block range;
 * omitting `endBlockId` limits the search to `startBlockId`. Throws for an empty
 * substring, invalid block range, or missing match so broken setup fails loudly.
 *
 * Returns `collapseToStart()` and `collapseToEnd()` for immediate selection setup.
 * They place the cursor at the matched substring's original start/end, even if
 * the selection has since moved, and do not focus the editor. They are not
 * bookmarks: use them only while the document is unchanged. Calling either after
 * a document change throws; call `selectText` again to find a fresh match.
 *
 * @example
 * const { editor } = await setupEditor({
 *   initialContent: [{ id: "text", type: "paragraph", content: "Before selected after" }],
 * });
 * selectText(editor, "selected");
 * await page.getByRole("button", { name: "Bold", exact: true }).click();
 *
 * @example
 * // Select the occurrence in a particular block, not an earlier duplicate.
 * selectText(editor, "Repeated text", { startBlockId: "second" });
 *
 * @example
 * // Put the cursor immediately after the matched text, without focusing.
 * selectText(editor, "selected").collapseToEnd();
 */
export function selectText(
  editor: Pick<BlockNoteEditor, "transact">,
  substring: string,
  range?: { startBlockId: string; endBlockId?: string },
) {
  if (substring.length === 0) {
    throw new Error("selectText requires a non-empty substring");
  }
  const matched = editor.transact((tr) => {
    let from = 0;
    let to = tr.doc.content.size;
    if (range) {
      const start = getNodeById(range.startBlockId, tr.doc);
      const end = getNodeById(range.endBlockId ?? range.startBlockId, tr.doc);
      if (!start || !end) {
        throw new Error("selectText could not find the requested block range");
      }
      from = start.posBeforeNode;
      to = end.posBeforeNode + end.node.nodeSize;
      if (from >= to) {
        throw new Error("selectText requires blocks in document order");
      }
    }

    let text = "";
    let textStart = 0;
    let match: { from: number; to: number } | undefined;
    tr.doc.nodesBetween(from, to, (node, pos) => {
      if (match) {
        return false;
      }
      if (!node.isText) {
        if (node.isBlock || node.isLeaf) {
          text = "";
        }
        return true;
      }
      // Adjacent text nodes can have different marks. Gaps indicate a hard
      // break, another inline node, or a new block, and must reset the search.
      if (pos !== textStart + text.length) {
        text = "";
        textStart = pos;
      }
      text += node.textContent;
      const index = text.indexOf(substring);
      if (index !== -1) {
        match = {
          from: textStart + index,
          to: textStart + index + substring.length,
        };
      }
      return true;
    });
    if (!match) {
      throw new Error(`selectText could not find ${JSON.stringify(substring)}`);
    }
    tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
    return { ...match, doc: tr.doc, selection: tr.selection };
  });

  function collapseTo(position: number) {
    editor.transact((tr) => {
      if (tr.doc !== matched.doc) {
        throw new Error(
          "selectText cannot collapse after the document changed; select the text again",
        );
      }
      tr.setSelection(TextSelection.create(tr.doc, position));
    });
  }

  return {
    collapseToStart() {
      collapseTo(matched.from);
    },
    collapseToEnd() {
      collapseTo(matched.to);
    },
    selection: matched.selection,
  };
}
