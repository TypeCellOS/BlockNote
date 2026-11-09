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
