/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { SuggestionsExtension, withCollaboration } from "./index.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()!();
  }
});

function mountEditor(
  fragment: Y.Node,
  suggestionDoc?: Y.Doc,
  renderer?: Y.DiffRenderer,
) {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        suggestionDoc,
        renderer,
        provider: undefined,
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  cleanups.push(() => {
    editor.unmount();
    element.remove();
  });
  return { editor, element };
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("collaboration editor remount", () => {
  it("keeps syncing local and remote edits after remounting the same editor", async () => {
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    const { editor: alice, element } = mountEditor(doc.get("doc"));
    const { editor: bob } = mountEditor(doc.get("doc"));

    alice.unmount();
    alice.mount(element);
    alice.replaceBlocks(alice.document, [
      { id: "alice-block", type: "paragraph", content: "Alice" },
    ]);
    await tick();
    expect(bob.document[0].content).toEqual(alice.document[0].content);
    expect(doc.get("doc").length).toBe(1);

    bob.replaceBlocks(bob.document, [
      { id: "bob-block", type: "paragraph", content: "Bob" },
    ]);
    await tick();
    expect(alice.document[0].content).toEqual(bob.document[0].content);
  });

  it("preserves the active suggestion document and renderer on remount", async () => {
    const doc = new Y.Doc();
    const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
    cleanups.push(
      () => doc.destroy(),
      () => suggestionDoc.destroy(),
    );
    const renderer = Y.createDiffRenderer(doc, suggestionDoc);
    renderer.suggestionMode = true;
    const { editor, element } = mountEditor(
      doc.get("doc"),
      suggestionDoc,
      renderer,
    );
    editor.getExtension(SuggestionsExtension)!.enableSuggestions();
    const activeType = ySyncPluginKey.getState(editor.prosemirrorState)!.ytype;

    editor.unmount();
    editor.mount(element);
    const state = ySyncPluginKey.getState(editor.prosemirrorState)!;
    expect(state.ytype).toBe(activeType);
    expect(state.renderer).toBe(renderer);

    editor.replaceBlocks(editor.document, [
      { id: "suggestion-block", type: "paragraph", content: "Suggested" },
    ]);
    await tick();
    expect(suggestionDoc.get("doc").length).toBe(1);
    expect(doc.get("doc").length).toBe(0);
  });
});
