import "@blocknote/core/style.css";

import { BlockNoteSchema } from "@blocknote/core";
import { expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { createReactMathBlockSpec } from "../../../block/createReactMathBlockSpec.js";
import { createReactInlineMathSpec } from "../../createReactMathInlineContentSpec.js";
import { MathInlineInputRulesExtension } from "./MathInlineInputRulesExtension.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { mathBlock: createReactMathBlockSpec() },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

it.for(["$x$", "\\(x\\)", "$$ ", "\\[ "])(
  "Backspace restores the literal %s through the shared input-rule engine",
  async (text, { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      schema,
      // The closed preview captures Backspace before the editor keymap and
      // removes the entire block. Exercise the input-rule engine without that
      // separate UI behavior, as the previous headless tests did.
      disableExtensions: ["sourceBlockWithPreview"],
    });
    editor.focus();
    await userEvent.keyboard(text.replaceAll("[", "[["));
    if (text.endsWith(" ")) {
      expect(editor.document[0].type).toBe("mathBlock");
    } else {
      expect(editor.document[0].content).toMatchObject([{ type: "math" }]);
    }
    await userEvent.keyboard("{Backspace}");
    expect(editor.document[0].type).toBe("paragraph");
    expect(editor.document[0].content).toEqual([
      { type: "text", text, styles: {} },
    ]);
    await userEvent.keyboard("x");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: text + "x", styles: {} },
    ]);
  },
);

it("retains literal delimiters when registered without the math inline spec", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    extensions: [MathInlineInputRulesExtension],
    skin: "raw",
  });
  editor.focus();
  const text = "$x$ \\(y\\)";
  await userEvent.keyboard(text);
  expect(editor.document[0].content).toEqual([
    { type: "text", text, styles: {} },
  ]);
});
