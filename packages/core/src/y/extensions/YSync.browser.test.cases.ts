import { beforeEach, expect } from "vite-plus/test";
import * as Y from "@y/y";
import { ySyncPluginKey } from "@y/prosemirror";
import type { CommandContext } from "../../../../../tests/src/commands/index.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYDoc } from "../utils.js";
import { withCollaboration } from "./index.js";

class Provider {
  awareness = undefined;
  synced = false;
  listeners = new Set<(synced: boolean) => void>();

  on(_event: "synced", listener: (synced: boolean) => void) {
    this.listeners.add(listener);
  }
  off(_event: "synced", listener: (synced: boolean) => void) {
    this.listeners.delete(listener);
  }
  sync(synced = true) {
    this.synced = synced;
    for (const listener of this.listeners) {
      listener(synced);
    }
  }
}

const cleanups: Array<() => void> = [];

async function cachedDocument(setupEditor: CommandContext["setupEditor"]) {
  const { editor: schema } = await setupEditor({ mountType: false });
  const doc = blocksToYDoc(
    schema,
    [{ type: "paragraph", content: "Cached" }],
    "doc",
  );
  cleanups.push(() => doc.destroy());
  return doc;
}

async function setup(
  setupEditor: CommandContext["setupEditor"],
  doc: Y.Doc,
  provider?: { awareness?: undefined },
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.get("doc"),
        provider,
        user: { name: "Test", color: "red" },
      },
    }),
  });
  return editor;
}

function isLoading(editor: BlockNoteEditor) {
  return editor.domElement!.classList.contains("bn-loading");
}

export function registerYSyncCases() {
  beforeEach(({ onTestFinished }) => {
    onTestFinished(() => {
      for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
      }
    });
  });

  it("connects immediately but blocks editing until the first sync", async ({
    setupEditor,
  }) => {
    const provider = new Provider();
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    const editor = await setup(setupEditor, doc, provider);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
      doc.get("doc"),
    );
    expect(doc.get("doc").length).toBe(0);
    expect(editor.isEditable).toBe(false);
    expect(editor.domElement!.getAttribute("contenteditable")).toBe("false");
    expect(isLoading(editor)).toBe(true);
    provider.sync(false);
    expect(editor.isEditable).toBe(false);
    provider.sync();
    expect(editor.isEditable).toBe(true);
    expect(isLoading(editor)).toBe(false);
  });

  it("does not autolink text that arrives from another client", async ({
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    const editor = await setup(setupEditor, doc);
    const remoteDoc = blocksToYDoc(
      editor,
      [
        { type: "paragraph", content: "Visit example.com" },
        { type: "paragraph", content: "Second block" },
      ],
      "doc",
    );
    cleanups.push(() => remoteDoc.destroy());

    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc));

    expect(editor.document.map((block) => block.content)).toEqual([
      [{ type: "text", text: "Visit example.com", styles: {} }],
      [{ type: "text", text: "Second block", styles: {} }],
    ]);
  });

  it("autolinks a URL typed locally", async ({ setupEditor }) => {
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    const editor = await setup(setupEditor, doc);
    editor.replaceBlocks(editor.document, [
      { id: "typed", type: "paragraph", content: "Visit" },
    ]);
    editor.setTextCursorPosition("typed", "end");

    editor.transact((tr) => tr.insertText(" example.com"));
    editor.transact((tr) => tr.insertText(" "));

    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Visit ", styles: {} },
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "example.com", styles: {} }],
      },
      { type: "text", text: " ", styles: {} },
    ]);
  });

  it("allows editing cached content without waiting for the server", async ({
    setupEditor,
  }) => {
    const server = await cachedDocument(setupEditor);
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
    const provider = new Provider();
    const editor = await setup(setupEditor, doc, provider);
    expect(editor.domElement!.textContent).toBe("Cached");
    expect(editor.isEditable).toBe(true);
    expect(isLoading(editor)).toBe(false);
    editor.updateBlock(editor.document[0], { content: "Offline edit" });
    expect(provider.synced).toBe(false);
    Y.applyUpdate(server, Y.encodeStateAsUpdate(doc));
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
    provider.sync();
    expect(doc.get("doc").length).toBe(1);
    expect(editor.domElement!.textContent).toBe("Offline edit");
    const peer = await setup(setupEditor, server);
    expect(peer.domElement!.textContent).toBe("Offline edit");
  });
}
