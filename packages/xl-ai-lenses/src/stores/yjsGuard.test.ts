import { BlockNoteEditor } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/yjs";
import { transformToSuggestionTransaction } from "@handlewithcare/prosemirror-suggest-changes";
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension } from "../../AIExtension.js";
import { assertNoYjsSuggestions, yFragmentHasSuggestions } from "./yjsGuard.js";

const mounted: BlockNoteEditor<any, any, any>[] = [];
afterEach(() => {
  while (mounted.length) {
    mounted.pop()?._tiptapEditor.destroy();
  }
});

/** An editor that is bound to a new Y.Doc, with one paragraph. */
function createSharedEditor() {
  const fragment = new Y.Doc().getXmlFragment("document-store");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      extensions: [AIExtension()],
      collaboration: { fragment, user: { name: "User", color: "#f00" } },
    }),
  );
  editor.mount(document.createElement("div"));
  mounted.push(editor);
  editor.replaceBlocks(editor.document, [
    { id: "p1", type: "paragraph", content: "First paragraph." },
  ]);
  return { editor, fragment };
}

describe("the guard for a shared Yjs document", () => {
  it("finds no suggestion in a normal document", () => {
    const { fragment } = createSharedEditor();

    expect(yFragmentHasSuggestions(fragment)).toBe(false);
    expect(() => assertNoYjsSuggestions(fragment, "doc")).not.toThrow();
  });

  it("finds the text of a suggestion that a client wrote into the shared document", () => {
    const { editor, fragment } = createSharedEditor();
    // A bug of a client: a suggestion without a fork of the Y.Doc.
    editor.exec((state, dispatch) => {
      const tr = state.tr.insertText("New ", 3);
      dispatch?.(transformToSuggestionTransaction(tr, state));
      return true;
    });

    expect(yFragmentHasSuggestions(fragment)).toBe(true);
    expect(() => assertNoYjsSuggestions(fragment, "doc")).toThrow(
      "The shared document doc has suggestion marks",
    );
  });
});
