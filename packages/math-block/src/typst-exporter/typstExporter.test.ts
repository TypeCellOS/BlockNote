import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-typst-exporter";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { compileTypstForTesting } from "@shared/util/typstTestUtil.js";
import { describe, expect, it } from "vite-plus/test";

import { inlineMathMapping, mathBlockMapping } from "./index.js";

function createExporter() {
  // Assembled outside the constructor call as the schema doesn't include
  // the math specs - like the default mappings, the math entries just map
  // the block JSON.
  const mappings = {
    ...typstDefaultSchemaMappings,
    blockMapping: {
      ...typstDefaultSchemaMappings.blockMapping,
      mathBlock: mathBlockMapping,
    },
    inlineContentMapping: {
      ...typstDefaultSchemaMappings.inlineContentMapping,
      math: inlineMathMapping,
    },
  };
  return new TypstExporter(
    BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs } }),
    mappings,
  );
}

describe("typst exporter mappings", () => {
  it(
    "should export math as native typst equations",
    { timeout: 20000 },
    async () => {
      const exporter = createExporter();

      // The math block & inline math paragraph from the shared test document.
      const typst = await exporter.toTypst(
        // `as any`: the filtered subset holds no multi-column blocks, but the
        // fixture's type still carries them and this schema doesn't.
        testDocumentWithSourceBlocks.filter((block) =>
          ["math-block", "paragraph-with-inline-math"].includes(block.id),
        ) as any,
        { title: "Math" },
      );

      await expect(typst).toMatchFileSnapshot(
        "__snapshots__/withMathMappings/mathDocument.typ",
      );

      // Compile under Typst's own PDF/UA-1 validation - it *errors* on
      // equations without alt text, so this proves the mappings' equations
      // stay UA-conformant end-to-end.
      const pdf = await compileTypstForTesting(typst, {
        // The preamble references the exporter's bundled code-theme asset.
        assets: exporter.assetFiles,
        pdfStandard: "ua-1",
      });
      expect(pdf.length).toBeGreaterThan(0);
    },
  );

  it("should render an error placeholder for invalid LaTeX", async () => {
    const exporter = createExporter();

    const typst = await exporter.toTypst([
      {
        id: "1",
        type: "mathBlock",
        props: {},
        content: [{ type: "text", text: "\\invalidmacro{", styles: {} }],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "Inline: ", styles: {} },
          { type: "math", props: {}, content: "\\alsobroken{" },
        ],
        children: [],
      },
    ] as any);

    // The editor-style placeholder (identifying the formula by its source),
    // not the parser's message - and no equation for the invalid sources.
    // (In the .typ string literal, `\` and `"` are escaped.)
    expect(typst).toContain('Invalid formula \\"\\\\invalidmacro{\\"');
    expect(typst).toContain('Invalid formula \\"\\\\alsobroken{\\"');
    expect(typst).not.toContain("math.equation");
  });

  it("should render nothing for empty math", async () => {
    const exporter = createExporter();

    const typst = await exporter.toTypst([
      {
        id: "1",
        type: "mathBlock",
        props: {},
        content: [],
        children: [],
      },
    ] as any);

    expect(typst).not.toContain("math.equation");
    expect(typst).not.toContain("Invalid formula");
  });
});
