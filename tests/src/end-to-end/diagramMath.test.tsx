import { BlockNoteSchema } from "@blocknote/core";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  createReactMathBlockSpec,
  createReactInlineMathSpec,
} from "@blocknote/math-block";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/math-block/style.css";
import type { ReactNode } from "react";
import { expect } from "vite-plus/test";
import { expectElement } from "../utils/editor.js";

it.for(["block", "inline"] as const)(
  "%s math typesets fractions and sums in diagram labels",
  async (kind, { setupEditor }) => {
    const options = {
      skin: "raw" as const,
      initialContent: [
        {
          type: "diagram" as const,
          content:
            'graph LR\n A["$$\\frac{a}{b}$$"] --> B["$$\\sum_{i=1}^{n} i^2$$"]',
        },
      ],
      outside: ({ children }: { children: ReactNode }) => (
        <div
          style={{
            width: 600,
            background: "white",
            color: "black",
            padding: 24,
          }}
        >
          {children}
        </div>
      ),
    };
    const diagram = createReactDiagramBlockSpec();
    const { rootNode } =
      kind === "block"
        ? await setupEditor({
            ...options,
            schema: BlockNoteSchema.create().extend({
              blockSpecs: { diagram, mathBlock: createReactMathBlockSpec() },
            }),
          })
        : await setupEditor({
            ...options,
            schema: BlockNoteSchema.create().extend({
              blockSpecs: { diagram },
              inlineContentSpecs: { math: createReactInlineMathSpec() },
            }),
          });
    const host = rootNode.firstElementChild;
    await expect
      .poll(() => host?.querySelector('[data-content-type="diagram"] svg'))
      .not.toBeNull();
    await expectElement(host).toMatchScreenshot(`diagram-math-${kind}`, {
      comparatorOptions: { allowedMismatchedPixelRatio: 0.005 },
    });
  },
);
