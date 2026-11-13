import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactBlockSpec } from "./ReactBlockSpec.js";
import { createReactInlineContentSpec } from "./ReactInlineContentSpec.js";

it.each(["setter", "prop"] as const)(
  "invalidates React node views when editability changes through the %s",
  async (entryPoint) => {
    const schema = BlockNoteSchema.create().extend({
      blockSpecs: {
        test: createReactBlockSpec(
          { type: "test", propSchema: {}, content: "inline" },
          {
            render: function TestBlock(props) {
              const [initialEditable] = useState(props.isEditable);
              return (
                <div>
                  <span data-editability="block" data-initial={initialEditable}>
                    {props.isEditable ? "editable" : "readonly"}
                  </span>
                  <div ref={props.contentRef} />
                </div>
              );
            },
            renderFrame(props) {
              return (
                <section>
                  <span data-editability="frame">
                    {props.isEditable ? "editable" : "readonly"}
                  </span>
                  <div ref={props.slotRef} />
                </section>
              );
            },
          },
        )(),
      },
      inlineContentSpecs: {
        testInline: createReactInlineContentSpec(
          { type: "testInline", propSchema: {}, content: "none" },
          {
            render(props) {
              return (
                <span data-editability="inline">
                  {props.isEditable ? "editable" : "readonly"}
                </span>
              );
            },
          },
        ),
      },
    });
    const editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
      initialContent: [{ type: "test", content: [{ type: "testInline" }] }],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    async function expectEditability(editable: boolean) {
      await vi.waitFor(() => {
        const indicators = host.querySelectorAll("[data-editability]");
        expect(indicators.length).toBe(3);
        for (const indicator of indicators) {
          expect(indicator.textContent).toBe(
            editable ? "editable" : "readonly",
          );
        }
      });
    }

    try {
      flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
      await expectEditability(true);
      const blockIndicator = host.querySelector('[data-editability="block"]');
      const documentBefore = editor.document;
      const selectionBefore = editor.prosemirrorState.selection;

      for (const editable of [false, true]) {
        flushSync(() => {
          if (entryPoint === "setter") {
            editor.isEditable = editable;
          } else {
            root.render(
              <BlockNoteViewRaw editor={editor} editable={editable} />,
            );
          }
        });
        await expectEditability(editable);
        if (entryPoint === "setter") {
          // Direct invalidation must not remount the view or lose local state.
          expect(host.querySelector('[data-editability="block"]')).toBe(
            blockIndicator,
          );
          expect(blockIndicator?.getAttribute("data-initial")).toBe("true");
        }
        expect(editor.document).toEqual(documentBefore);
        expect(editor.prosemirrorState.selection.eq(selectionBefore)).toBe(
          true,
        );
      }

      const release = editor.acquireEditingLock();
      await expectEditability(false);
      release();
      await expectEditability(true);
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
