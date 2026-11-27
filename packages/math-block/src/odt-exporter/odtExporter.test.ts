import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import { testDocumentWithSourceBlocks } from "../../../../tests/src/fixtures/exporters/testDocument.js";
import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";
import { describe, expect, vi } from "vite-plus/test";

import { inlineMathMapping, mathBlockMapping } from "./index.js";

describe("odt exporter mappings", () => {
  it("should render error placeholders for invalid LaTeX", async ({
    testResolveFileUrl,
    onTestFinished,
  }) => {
    const error = vi.spyOn(console, "error");
    onTestFinished(() => {
      error.mockRestore();
    });
    // Assembled outside the constructor call as the schema doesn't include
    // the math specs - like the default mappings, the math entries just map
    // the block JSON.
    const mappings = {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        math: inlineMathMapping,
      },
    };
    const exporter = new ODTExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      mappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    const odt = await exporter.toODTDocument([
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
    const zipReader = new ZipReader(new BlobReader(odt));
    const entries = await zipReader.getEntries();
    const contentXML = entries.find(
      (entry) => entry.filename === "content.xml",
    ) as FileEntry;
    const content = await contentXML.getData(new TextWriter());

    // Mirrors the editor's error placeholder rather than dumping the LaTeX
    // source on readers - once for the block, once for the inline math.
    expect(content.match(/Invalid formula/g)).toHaveLength(2);
    expect(content).not.toContain("draw:object");
    expect(error.mock.calls.map(([message]) => message)).not.toContainEqual(
      expect.stringContaining(
        'Each child in a list should have a unique "key"',
      ),
    );
  });

  it(
    "should export math as native formulas",
    { timeout: 10000 },
    async ({ testResolveFileUrl, testODTDocumentAgainstSnapshot }) => {
      // Assembled outside the constructor call as the schema doesn't include
      // the math specs - like the default mappings, the math entries just
      // map the block JSON.
      const mappings = {
        ...odtDefaultSchemaMappings,
        blockMapping: {
          ...odtDefaultSchemaMappings.blockMapping,
          mathBlock: mathBlockMapping,
        },
        inlineContentMapping: {
          ...odtDefaultSchemaMappings.inlineContentMapping,
          math: inlineMathMapping,
        },
      };
      const exporter = new ODTExporter(
        BlockNoteSchema.create({
          blockSpecs: {
            ...defaultBlockSpecs,
            pageBreak: createPageBreakBlockSpec(),
          },
        }),
        mappings,
        { resolveFileUrl: testResolveFileUrl },
      );

      // The math block & inline math paragraph from the shared test document.
      const odt = await exporter.toODTDocument(
        // `as any`: the filtered subset holds no multi-column blocks, but the
        // fixture's type still carries them and this schema doesn't.
        testDocumentWithSourceBlocks.filter((block) =>
          ["math-block", "paragraph-with-inline-math"].includes(block.id),
        ) as any,
      );
      // The math block & the inline math each embed one formula object.
      await testODTDocumentAgainstSnapshot(odt, {
        styles: "__snapshots__/withMathMappings/styles.xml",
        content: "__snapshots__/withMathMappings/content.xml",
        objects: {
          snapshot: "__snapshots__/withMathMappings/objects.xml",
          expectedCount: 2,
        },
      });
    },
  );
});
