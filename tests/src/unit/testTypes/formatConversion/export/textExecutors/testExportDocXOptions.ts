import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  docxDefaultSchemaMappings,
  DOCXExporter,
} from "@blocknote/xl-docx-exporter";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { Packer, Paragraph, TextRun } from "docx";
import { expect } from "vitest";

import {
  addIdsToBlocks,
  getZIPEntryContent,
  partialBlocksToBlocksForTesting,
  prettify,
} from "../../formatConversionTestUtil.js";
import { ExportTestCase } from "../exportTestCase.js";

export const testExportDocXOptions = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exporter = new DOCXExporter(editor.schema, docxDefaultSchemaMappings);

  const doc = await exporter.toDocxJsDocument(
    partialBlocksToBlocksForTesting(editor.schema, testCase.content),
    {
      documentOptions: {
        creator: "John Doe",
      },
      sectionOptions: {
        headers: {
          default: {
            options: {
              children: [new Paragraph({ children: [new TextRun("Header")] })],
            },
          },
        },
        footers: {
          default: {
            options: {
              children: [new Paragraph({ children: [new TextRun("Footer")] })],
            },
          },
        },
      },
    },
  );

  const blob = await Packer.toBlob(doc);

  // fs.writeFileSync(__dirname + "/My Document.docx", buffer);

  const zip = new ZipReader(new BlobReader(blob));
  const entries = await zip.getEntries();

  // files related to header / footer
  await expect(
    prettify(await getZIPEntryContent(entries, "word/_rels/document.xml.rels")),
  ).toMatchFileSnapshot("__snapshots__/withCustomOptions/document.xml.rels");

  await expect(
    prettify(await getZIPEntryContent(entries, "word/header1.xml")),
  ).toMatchFileSnapshot("__snapshots__/withCustomOptions/header1.xml");

  await expect(
    prettify(await getZIPEntryContent(entries, "word/footer1.xml")),
  ).toMatchFileSnapshot("__snapshots__/withCustomOptions/footer1.xml");

  // has author data
  await expect(
    prettify(await getZIPEntryContent(entries, "docProps/core.xml")),
  ).toMatchFileSnapshot("__snapshots__/withCustomOptions/core.xml");
};
