// @vitest-environment jsdom
import { afterEach, expect, it } from "vite-plus/test";
import * as Y from "@y/y";
import { ySyncPluginKey } from "@y/prosemirror";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
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
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function cachedDocument() {
  const schema = BlockNoteEditor.create();
  const doc = blocksToYDoc(
    schema,
    [{ type: "paragraph", content: "Cached" }],
    "doc",
  );
  schema._tiptapEditor.destroy();
  cleanups.push(() => doc.destroy());
  return doc;
}

function setup(doc = new Y.Doc(), provider?: { awareness?: undefined }) {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        provider,
        user: { name: "Test", color: "red" },
      },
    }),
  );
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    editor._tiptapEditor.destroy();
    host.remove();
    doc.destroy();
  });
  return { editor, doc, host };
}

function isLoading(editor: BlockNoteEditor) {
  return editor.domElement!.classList.contains("bn-loading");
}

it("connects immediately but blocks editing until the first sync", () => {
  const provider = new Provider();
  const { editor, doc } = setup(undefined, provider);
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

// A change that arrives from Yjs is not typing: the client that wrote the
// text made its links. The same test for the y-prosemirror binding is in
// `extensions/tiptap-extensions/Link/link.test.ts`.
it("does not autolink text that arrives from another client", () => {
  const { editor, doc } = setup();

  // The other client wrote "example.com" as plain text.
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

// The guard for the test above: a URL that a user types in an editor with
// collaboration gets its link.
it("autolinks a URL that a user types", () => {
  const { editor } = setup();
  editor.replaceBlocks(editor.document, [
    { id: "typed", type: "paragraph", content: "Visit" },
  ]);
  editor.setTextCursorPosition("typed", "end");

  const view = editor.prosemirrorView!;
  view.dispatch(view.state.tr.insertText(" example.com"));
  view.dispatch(view.state.tr.insertText(" "));

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

it("allows editing cached content without waiting for the server", () => {
  const server = cachedDocument();
  const local = new Y.Doc();
  Y.applyUpdate(local, Y.encodeStateAsUpdate(server));
  const provider = new Provider();
  const { editor, doc } = setup(local, provider);
  expect(editor.prosemirrorState.doc.textContent).toBe("Cached");
  expect(editor.isEditable).toBe(true);
  expect(isLoading(editor)).toBe(false);
  editor.updateBlock(editor.document[0], { content: "Offline edit" });
  expect(provider.synced).toBe(false);
  Y.applyUpdate(server, Y.encodeStateAsUpdate(doc));
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
  provider.sync();
  expect(doc.get("doc").length).toBe(1);
  expect(editor.prosemirrorState.doc.textContent).toBe("Offline edit");
  const { editor: peer } = setup(server);
  expect(peer.prosemirrorState.doc.textContent).toBe("Offline edit");
});
