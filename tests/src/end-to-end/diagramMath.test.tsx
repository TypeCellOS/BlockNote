import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  createReactMathBlockSpec,
  createReactInlineMathSpec,
} from "@blocknote/math-block";
import { BlockNoteViewRaw } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/math-block/style.css";
import { createRoot } from "react-dom/client";
import { expect, test } from "vite-plus/test";
import { expectElement } from "../utils/editor.js";

test.each(["block", "inline"] as const)(
  "%s math typesets fractions and sums in diagram labels",
  async (kind) => {
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: {
          diagram: createReactDiagramBlockSpec(),
          ...(kind === "block"
            ? { mathBlock: createReactMathBlockSpec() }
            : {}),
        },
        inlineContentSpecs:
          kind === "inline" ? { math: createReactInlineMathSpec() } : {},
      }),
      initialContent: [
        {
          type: "diagram",
          content:
            'graph LR\n A["$$\\frac{a}{b}$$"] --> B["$$\\sum_{i=1}^{n} i^2$$"]',
        },
      ],
    });
    const host = document.createElement("div");
    host.style.cssText =
      "width:600px;background:white;color:black;padding:24px";
    document.body.append(host);
    const root = createRoot(host);
    try {
      root.render(<BlockNoteViewRaw editor={editor} />);
      await expect
        .poll(() => host.querySelector('[data-content-type="diagram"] svg'))
        .not.toBeNull();
      await document.fonts.ready;
      await expectElement(host).toMatchScreenshot(`diagram-math-${kind}`, {
        comparatorOptions: { allowedMismatchedPixelRatio: 0.005 },
      });
    } finally {
      root.unmount();
      host.remove();
      editor.unmount();
    }
  },
);
