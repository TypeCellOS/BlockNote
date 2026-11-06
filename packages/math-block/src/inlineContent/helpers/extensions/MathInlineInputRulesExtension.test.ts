// @vitest-environment node
import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { expect, it } from "vite-plus/test";
import { createReactMathBlockSpec } from "../../../block/createReactMathBlockSpec.js";
import { createReactInlineMathSpec } from "../../createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { mathBlock: createReactMathBlockSpec() },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

it.each(["$x$", "\\(x\\)", "$$ ", "\\[ "])(
  "Backspace restores the literal %s through the shared input-rule engine",
  (text) => {
    const editor = BlockNoteEditor.create({ schema });
    try {
      // Input rules and keymaps need real state and dispatch, not DOM rendering.
      const view = editor.prosemirrorView;
      view.updateState(
        view.state.reconfigure({
          plugins: editor._tiptapEditor.extensionManager.plugins,
        }),
      );
      function typeText(value: string) {
        for (const char of value) {
          const { from, to } = view.state.selection;
          const insert = () => view.state.tr.insertText(char, from, to);
          if (
            !view.state.plugins.some((plugin) =>
              plugin.props.handleTextInput?.call(
                plugin,
                view,
                from,
                to,
                char,
                insert,
              ),
            )
          ) {
            view.dispatch(insert());
          }
        }
      }
      typeText(text);
      if (text.endsWith(" ")) {
        expect(editor.document[0].type).toBe("mathBlock");
      } else {
        expect(editor.document[0].content).toMatchObject([{ type: "math" }]);
      }
      const event = { key: "Backspace", keyCode: 8 } as KeyboardEvent;
      expect(
        view.state.plugins.some((plugin) =>
          plugin.props.handleKeyDown?.call(plugin, view, event),
        ),
      ).toBe(true);
      expect(editor.document[0].type).toBe("paragraph");
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: {} },
      ]);
      typeText("x");
      expect(view.state.doc.textContent).toBe(text + "x");
    } finally {
      editor._tiptapEditor.destroy();
    }
  },
);
