import "@blocknote/core/style.css";

import { BlockNoteSchema, createExtension } from "@blocknote/core";
import { SourceInlineContentWithPreviewExtension } from "@blocknote/core/extensions";
import { Plugin } from "prosemirror-state";
import { flushSync } from "react-dom";
import { expect, vi } from "vite-plus/test";

import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

it.for([
  { editable: false, batched: false, pluginReadOnly: false },
  { editable: true, batched: false, pluginReadOnly: false },
  { editable: true, batched: true, pluginReadOnly: false },
  { editable: true, batched: false, pluginReadOnly: true },
  { editable: true, batched: true, pluginReadOnly: true },
])(
  "inline math popup follows editability (#3291): %j",
  async (
    { editable, batched, pluginReadOnly },
    { setupEditor, selectText },
  ) => {
    const pluginEditability = createExtension(() => ({
      key: "testPluginEditability",
      prosemirrorPlugins: [
        new Plugin({ props: { editable: () => !pluginReadOnly } }),
      ],
    }));
    const { editor, rootNode: host } = await setupEditor({
      skin: "raw",
      props: { editable },
      schema,
      extensions: [pluginEditability()],
      trailingBlock: false,
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "math", content: "x^2" }],
        },
      ],
    });

    async function expectPopup(open: boolean) {
      expect(editor.getSelectedText()).toBe("x^2");
      const selected = editor.getExtension(
        SourceInlineContentWithPreviewExtension,
      )!.store.state.selected;
      expect(selected !== undefined).toBe(open);
      await vi.waitFor(() =>
        expect(
          host
            .querySelector(".bn-preview-with-source-popup")
            ?.getAttribute("data-open"),
        ).toBe(String(open)),
      );
    }

    // Read-only ProseMirror views still move the selection on click. Exercise
    // that selection path directly, independently of the guarded preview click.
    flushSync(() => {
      selectText(editor, "x^2");
    });

    await expectPopup(editable && !pluginReadOnly);

    if (editable) {
      flushSync(() => {
        if (batched) {
          editor.transact(() => {
            editor.isEditable = false;
          });
        } else {
          editor.isEditable = false;
        }
      });

      await expectPopup(false);

      flushSync(() => {
        if (batched) {
          editor.transact(() => {
            editor.isEditable = true;
          });
        } else {
          editor.isEditable = true;
        }
      });

      await expectPopup(!pluginReadOnly);
    }
  },
);

it("tracks inline source popups through the editor API", async ({
  setupEditor,
  selectText,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    schema,
    initialContent: [
      { type: "paragraph", content: [{ type: "math", content: "x^2" }] },
    ],
  });
  expect(editor.domElement?.isConnected).toBe(true);
  selectText(editor, "x^2").collapseToStart();
  const { store } = editor.getExtension(
    SourceInlineContentWithPreviewExtension,
  )!;
  const selected = store.state.selected;
  expect(selected).toBeDefined();
  editor.isEditable = false;
  expect(store.state.selected).toBeUndefined();
  editor.isEditable = true;
  expect(store.state.selected).toBe(selected);
});
