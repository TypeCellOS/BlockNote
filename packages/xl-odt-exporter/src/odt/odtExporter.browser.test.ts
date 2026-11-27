import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "../../../../tests/src/fixtures/exporters/testDocument.js";

import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";

it("exports a document with a string footer and XMLDocument header", async ({
  testResolveFileUrl,
  testODTDocumentAgainstSnapshot,
}) => {
  const exporter = new ODTExporter(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
        column: ColumnBlock,
        columnList: ColumnListBlock,
      },
    }),
    odtDefaultSchemaMappings,
    { resolveFileUrl: testResolveFileUrl },
  );

  const odt = await exporter.toODTDocument(testDocument, {
    footer: "<text:p>FOOTER</text:p>",
    header: new DOMParser().parseFromString(
      `<text:p xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">HEADER</text:p>`,
      "text/xml",
    ),
  });

  await testODTDocumentAgainstSnapshot(odt, {
    styles: "__snapshots__/withCustomOptions/styles.xml",
    content: "__snapshots__/withCustomOptions/content.xml",
  });
});
