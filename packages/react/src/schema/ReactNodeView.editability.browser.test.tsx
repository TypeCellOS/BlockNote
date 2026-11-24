import { BlockNoteSchema } from "@blocknote/core";
import { useState } from "react";
import { flushSync } from "react-dom";
import { expect, vi } from "vite-plus/test";

import { createReactBlockSpec } from "./ReactBlockSpec.js";
import { createReactInlineContentSpec } from "./ReactInlineContentSpec.js";

it.for(["setter", "prop"] as const)(
  "invalidates React node views when editability changes through the %s",
  async (entryPoint, { setupEditor, selectText }) => {
    const schema = BlockNoteSchema.create().extend({
      blockSpecs: {
        test: createReactBlockSpec(
          { type: "test", propSchema: {}, content: "inline" },
          {
            render: function TestBlock(props) {
              const [initialEditable] = useState(props.editor.isEditable);
              return (
                <div>
                  <span data-editability="block" data-initial={initialEditable}>
                    {props.editor.isEditable ? "editable" : "readonly"}
                  </span>
                  <div ref={props.contentRef} />
                </div>
              );
            },
            renderFrame(props) {
              return (
                <section>
                  <span data-editability="frame">
                    {props.editor.isEditable ? "editable" : "readonly"}
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
                  {props.editor.isEditable ? "editable" : "readonly"}
                </span>
              );
            },
          },
        ),
      },
    });
    const {
      editor,
      rootNode: host,
      rerender,
    } = await setupEditor({
      skin: "raw",
      schema,
      trailingBlock: false,
      initialContent: [
        { type: "test", content: ["Selected", { type: "testInline" }] },
      ],
    });

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

    await expectEditability(true);
    selectText(editor, "Selected");
    const blockIndicator = host.querySelector('[data-editability="block"]');
    const documentBefore = editor.document;

    for (const editable of [false, true]) {
      if (entryPoint === "setter") {
        flushSync(() => {
          editor.isEditable = editable;
        });
      } else {
        rerender({ editable });
      }
      await expectEditability(editable);
      if (entryPoint === "setter") {
        // Direct invalidation must not remount the view or lose local state.
        expect(host.querySelector('[data-editability="block"]')).toBe(
          blockIndicator,
        );
        expect(blockIndicator?.getAttribute("data-initial")).toBe("true");
      }
      expect(editor.document).toEqual(documentBefore);
      expect(editor.getSelectedText()).toBe("Selected");
    }

    const release = editor.acquireEditingLock();
    await expectEditability(false);
    release();
    await expectEditability(true);
  },
);
