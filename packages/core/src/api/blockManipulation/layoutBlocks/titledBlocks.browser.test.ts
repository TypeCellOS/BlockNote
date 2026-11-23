import { NodeSelection } from "prosemirror-state";
import { expect } from "vite-plus/test";
import { getNodeById } from "../../nodeUtil.js";
import { layoutSchema as schema } from "./layoutBlocks.fixture.js";

const alert = {
  id: "w",
  type: "alert",
  content: "Title",
  children: [
    { id: "b1", type: "paragraph", content: "One" },
    { id: "b2", type: "paragraph", content: "Two" },
  ],
} satisfies typeof schema.PartialBlock;

const it = globalThis.it.extend<{ editor: typeof schema.BlockNoteEditor }>({
  editor: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      schema,
      initialContent: [alert],
    });
    await use(editor);
  },
});

it("frames the title and the body together in the live DOM", ({ editor }) => {
  const slot = editor.domElement?.querySelector(".alert-frame .alert-slot");
  expect(slot?.textContent).toBe("TitleOneTwo");
});

it("survives the clipboard round-trip that copy and drag use", ({ editor }) => {
  const view = editor.prosemirrorView;
  editor.transact((tr) =>
    tr.setSelection(
      NodeSelection.create(tr.doc, getNodeById("w", tr.doc)!.posBeforeNode),
    ),
  );
  const html = view.serializeForClipboard(view.state.selection.content()).dom
    .innerHTML;
  const [parsed] = editor.tryParseHTMLToBlocks(html);
  const [original] = editor.document;
  expect(parsed.type).toBe("alert");
  expect(parsed.content).toEqual(original.content);
  expect(
    parsed.children.map(({ type, content }) => ({ type, content })),
  ).toEqual(original.children.map(({ type, content }) => ({ type, content })));
});
