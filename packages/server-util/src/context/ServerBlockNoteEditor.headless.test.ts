import { expect, it } from "vite-plus/test";
import { ServerBlockNoteEditor } from "./ServerBlockNoteEditor.js";

const blocks = [
  { id: "headless", type: "paragraph", content: "No DOM" },
] as const;
const expected = [
  {
    id: "headless",
    type: "paragraph",
    content: [{ type: "text", text: "No DOM", styles: {} }],
    children: [],
  },
];

function expectNoDOM() {
  expect(globalThis.window).toBeUndefined();
  expect(globalThis.document).toBeUndefined();
}

it("creates a server editor and round-trips a Yjs document without DOM globals", () => {
  expectNoDOM();
  const editor = ServerBlockNoteEditor.create();
  const doc = editor.blocksToYDoc([...blocks]);
  try {
    expect(editor.yDocToBlocks(doc)).toMatchObject(expected);
  } finally {
    doc.destroy();
  }
  expectNoDOM();
});

it("round-trips through the server editor's ProseMirror conversion primitives without DOM globals", () => {
  expectNoDOM();
  const editor = ServerBlockNoteEditor.create();
  const node = editor._blocksToProsemirrorNode([...blocks]);
  expect(editor._prosemirrorNodeToBlocks(node)).toMatchObject(expected);
  expectNoDOM();
});
