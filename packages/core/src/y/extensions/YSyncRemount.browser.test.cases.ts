import { describe, expect } from "vite-plus/test";
import { ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { SuggestionsExtension, withCollaboration } from "./index.js";

async function mountEditor(
  setupEditor: SetupEditor,
  fragment: Y.Node,
  suggestionDoc?: Y.Doc,
  renderer?: Y.DiffRenderer,
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment,
        suggestionDoc,
        renderer,
        provider: undefined,
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  });
  const element = editor.domElement!;
  return { editor, element };
}

export function registerYSyncRemountCases() {
  describe("collaboration editor remount", () => {
    it("keeps syncing local and remote edits after remounting the same editor", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const doc = new Y.Doc();
      onTestFinished(() => doc.destroy());
      const { editor: alice, element } = await mountEditor(
        setupEditor,
        doc.get("doc"),
      );
      const { editor: bob } = await mountEditor(setupEditor, doc.get("doc"));

      alice.unmount();
      alice.mount(element);
      alice.replaceBlocks(alice.document, [
        { id: "alice-block", type: "paragraph", content: "Alice" },
      ]);
      await expect.poll(() => bob.document[0].id).toBe("alice-block");
      expect(bob.document[0].content).toEqual(alice.document[0].content);
      expect(doc.get("doc").length).toBe(1);

      bob.replaceBlocks(bob.document, [
        { id: "bob-block", type: "paragraph", content: "Bob" },
      ]);
      await expect.poll(() => alice.document[0].id).toBe("bob-block");
      expect(alice.document[0].content).toEqual(bob.document[0].content);
    });

    it("preserves the active suggestion document and renderer on remount", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const doc = new Y.Doc();
      onTestFinished(() => doc.destroy());
      const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
      onTestFinished(() => suggestionDoc.destroy());
      const renderer = Y.createDiffRenderer(doc, suggestionDoc);
      onTestFinished(() => renderer.destroy());
      renderer.suggestionMode = true;
      const { editor, element } = await mountEditor(
        setupEditor,
        doc.get("doc"),
        suggestionDoc,
        renderer,
      );
      editor.getExtension(SuggestionsExtension)!.enableSuggestions();
      const activeType = ySyncPluginKey.getState(
        editor.prosemirrorState,
      )!.ytype;

      editor.unmount();
      editor.mount(element);
      const state = ySyncPluginKey.getState(editor.prosemirrorState)!;
      expect(state.ytype).toBe(activeType);
      expect(state.renderer).toBe(renderer);

      editor.replaceBlocks(editor.document, [
        { id: "suggestion-block", type: "paragraph", content: "Suggested" },
      ]);
      await expect.poll(() => suggestionDoc.get("doc").length).toBe(1);
      expect(doc.get("doc").length).toBe(0);
    });
  });
}
