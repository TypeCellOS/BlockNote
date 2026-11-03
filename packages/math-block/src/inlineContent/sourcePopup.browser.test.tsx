import "@blocknote/core/style.css";

import {
  BlockNoteEditor,
  BlockNoteSchema,
  createExtension,
} from "@blocknote/core";
import { SourceInlineContentWithPreviewExtension } from "@blocknote/core/extensions";
import { BlockNoteViewRaw } from "@blocknote/react";
import { Plugin, TextSelection } from "prosemirror-state";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

import { createReactInlineMathSpec } from "./createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

it.each([
  { editable: false, batched: false, pluginReadOnly: false },
  { editable: true, batched: false, pluginReadOnly: false },
  { editable: true, batched: true, pluginReadOnly: false },
  { editable: true, batched: false, pluginReadOnly: true },
  { editable: true, batched: true, pluginReadOnly: true },
])(
  "inline math popup follows editability (#3291): %j",
  async ({ editable, batched, pluginReadOnly }) => {
    const pluginEditability = createExtension(() => ({
      key: "testPluginEditability",
      prosemirrorPlugins: [
        new Plugin({ props: { editable: () => !pluginReadOnly } }),
      ],
    }));
    const editor = BlockNoteEditor.create({
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
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      flushSync(() => {
        root.render(<BlockNoteViewRaw editor={editor} editable={editable} />);
      });

      let mathPos: number | undefined;
      editor.prosemirrorState.doc.descendants((node, pos) => {
        if (node.type.name === "math") {
          mathPos = pos;
        }
      });
      if (mathPos === undefined) {
        throw new Error("Inline math node not found");
      }
      const sourcePos = mathPos + 1;

      // Read-only ProseMirror views still move the selection on click. Exercise
      // that selection path directly, independently of the guarded preview click.
      flushSync(() => {
        editor.transact((tr) =>
          tr.setSelection(TextSelection.create(tr.doc, sourcePos)),
        );
      });

      expect(editor.prosemirrorState.selection.from).toBe(sourcePos);
      expect(
        editor.getExtension(SourceInlineContentWithPreviewExtension)!.store
          .state.selected,
      ).toBe(editable && !pluginReadOnly ? mathPos : undefined);
      await vi.waitFor(() =>
        expect(
          host
            .querySelector(".bn-preview-with-source-popup")
            ?.getAttribute("data-open"),
        ).toBe(String(editable && !pluginReadOnly)),
      );

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

        expect(editor.prosemirrorState.selection.from).toBe(sourcePos);
        expect(
          editor.getExtension(SourceInlineContentWithPreviewExtension)!.store
            .state.selected,
        ).toBeUndefined();
        await vi.waitFor(() =>
          expect(
            host
              .querySelector(".bn-preview-with-source-popup")
              ?.getAttribute("data-open"),
          ).toBe("false"),
        );

        flushSync(() => {
          if (batched) {
            editor.transact(() => {
              editor.isEditable = true;
            });
          } else {
            editor.isEditable = true;
          }
        });

        expect(editor.prosemirrorState.selection.from).toBe(sourcePos);
        expect(
          editor.getExtension(SourceInlineContentWithPreviewExtension)!.store
            .state.selected,
        ).toBe(pluginReadOnly ? undefined : mathPos);
        await vi.waitFor(() =>
          expect(
            host
              .querySelector(".bn-preview-with-source-popup")
              ?.getAttribute("data-open"),
          ).toBe(String(!pluginReadOnly)),
        );
      }
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);

it("mounts inline source popup tracking without the readOnly extension", () => {
  const editor = BlockNoteEditor.create({
    schema,
    disableExtensions: ["readOnly"],
    initialContent: [
      { type: "paragraph", content: [{ type: "math", content: "x^2" }] },
    ],
  });
  const host = document.createElement("div");
  document.body.append(host);

  try {
    editor.mount(host);
    expect(editor.prosemirrorView).toBeDefined();
    let mathPos: number | undefined;
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (node.type.name === "math") {
        mathPos = pos;
      }
    });
    if (mathPos === undefined) {
      throw new Error("Inline math node not found");
    }
    const sourcePos = mathPos + 1;
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, sourcePos)),
    );
    expect(
      editor.getExtension(SourceInlineContentWithPreviewExtension)!.store.state
        .selected,
    ).toBe(mathPos);
  } finally {
    editor._tiptapEditor.destroy();
    host.remove();
  }
});
