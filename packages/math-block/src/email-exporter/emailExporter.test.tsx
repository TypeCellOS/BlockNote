import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  createCIDImageDelivery,
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { describe, expect, it } from "vite-plus/test";

import {
  createInlineMathMapping,
  createMathBlockMapping,
  inlineMathMapping,
  mathBlockMapping,
} from "./index.js";

const mathTestDocument = testDocumentWithSourceBlocks.filter((block) =>
  ["math-block", "paragraph-with-inline-math"].includes(block.id),
);

const createExporter = (mappings: {
  math: typeof mathBlockMapping;
  inlineMath: typeof inlineMathMapping;
}) =>
  new ReactEmailExporter(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
      },
    }),
    {
      ...reactEmailDefaultSchemaMappings,
      blockMapping: {
        ...reactEmailDefaultSchemaMappings.blockMapping,
        mathBlock: mappings.math,
      },
      inlineContentMapping: {
        ...reactEmailDefaultSchemaMappings.inlineContentMapping,
        math: mappings.inlineMath,
      },
    } as any,
  );

describe("email exporter mappings", () => {
  it("should export math as SVG images outside the browser", async () => {
    const exporter = createExporter({
      math: mathBlockMapping,
      inlineMath: inlineMathMapping,
    });

    // Without a browser (or a plugged-in rasterizer), formulas are embedded
    // as SVG data URLs - MathJax's SVG output is environment-independent.
    const html = await exporter.toReactEmailDocument(mathTestDocument as any);
    expect(html).toContain("data:image/svg+xml;base64,");
    expect(html).toMatchSnapshot("__snapshots__/emailWithMathMappings");
  });

  it("should render error placeholders for invalid LaTeX", async () => {
    const exporter = createExporter({
      math: mathBlockMapping,
      inlineMath: inlineMathMapping,
    });

    const html = await exporter.toReactEmailDocument([
      {
        id: "1",
        type: "mathBlock",
        props: {},
        content: [{ type: "text", text: "\\invalidcommand{", styles: {} }],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "Broken: ", styles: {} },
          { type: "math", props: {}, content: "\\invalidcommand{" },
        ],
        children: [],
      },
    ] as any);

    // Mirrors the editor's error placeholder rather than dumping the LaTeX
    // source on readers - once for the block, once for the inline math.
    expect(html.match(/Invalid formula/g)).toHaveLength(2);
    expect(html).not.toContain("<img");
  });

  it("should deliver images as inline attachments with a CID delivery", async () => {
    const imageDelivery = createCIDImageDelivery();
    const exporter = createExporter({
      math: createMathBlockMapping({
        imageDelivery,
        // A stub rasterizer, standing in for e.g. @resvg/resvg-js on a
        // server.
        rasterize: async (svg) => ({
          mimeType: "image/png",
          data: new Uint8Array([0, 0, 0]),
          width: svg.width,
          height: svg.height,
        }),
      }),
      inlineMath: createInlineMathMapping({ imageDelivery }),
    });

    const html = await exporter.toReactEmailDocument(mathTestDocument as any);

    // The body references the attachments by CID; the image contents are
    // collected for the caller to attach at send time - the rasterized
    // block math as PNG, the inline math as SVG.
    expect(html).toContain('src="cid:math-1@blocknote"');
    expect(html).toContain('src="cid:math-2@blocknote"');
    expect(imageDelivery.attachments).toHaveLength(2);
    expect(imageDelivery.attachments[0]).toEqual({
      cid: "math-1@blocknote",
      filename: "math-1.png",
      content: "AAAA",
      encoding: "base64",
      contentType: "image/png",
      contentDisposition: "inline",
    });
    expect(imageDelivery.attachments[1].contentType).toBe("image/svg+xml");
    expect(imageDelivery.attachments[1].filename).toBe("math-2.svg");
  });
});
