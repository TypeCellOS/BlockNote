/**
 * @vitest-environment jsdom
 */
import {
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import { withCollaboration } from "../extensions/index.js";
import { RESTYjsThreadStore } from "./RESTYjsThreadStore.js";

function createCollabEditor() {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Test User", color: "#FF0000" },
        provider: undefined,
      },
      trailingBlock: false,
    }),
  );
  editor.mount(document.createElement("div"));
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Hello World" },
  ]);
  return { editor, doc, fragment };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RESTYjsThreadStore", () => {
  it("sends resolvable yjs positions along with the thread", async () => {
    const { editor, doc, fragment } = createCollabEditor();

    const requests: any[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((async (
      _url: any,
      init: any,
    ) => {
      requests.push(JSON.parse(init.body));
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any);

    const store = new RESTYjsThreadStore(
      "https://example.com/threads",
      {},
      doc.getMap("threads"),
      new DefaultThreadStoreAuth("user-1", "editor"),
    );

    await store.addThreadToDocument({
      threadId: "thread-1",
      selection: { anchor: 3, head: 8 },
      editor,
    });

    expect(requests).toHaveLength(1);
    const { yjs } = requests[0].selection;
    expect(yjs).toBeDefined();

    // the relative positions must resolve back to the positions we passed in
    const state = ySyncPluginKey.getState(editor.prosemirrorState) as any;
    const resolve = (relPos: any) =>
      relativePositionToAbsolutePosition(
        fragment.doc!,
        state.binding.type,
        Y.createRelativePositionFromJSON(relPos),
        state.binding.mapping,
      );

    expect(resolve(yjs.anchor)).toBe(3);
    expect(resolve(yjs.head)).toBe(8);
  });
});
