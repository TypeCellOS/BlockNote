import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  defaultBlockSpecs,
  InlineContentSchema,
  PageBreak,
  StyleSchema,
} from "@blocknote/core";
import {
  docxDefaultSchemaMappings,
  DOCXExporter,
} from "@blocknote/xl-docx-exporter";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { Packer } from "docx";
import { expect } from "vitest";

import {
  addIdsToBlocks,
  getZIPEntryContent,
  partialBlocksToBlocksForTesting,
  prettify,
} from "../../formatConversionTestUtil.js";
import { ExportTestCase } from "../exportTestCase.js";

export const testExportDocX = async <
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
  );

  const blob = await Packer.toBlob(doc);
  const zip = new ZipReader(new BlobReader(blob));
  const entries = await zip.getEntries();

  await expect(
    prettify(await getZIPEntryContent(entries, "word/document.xml")),
  ).toMatchFileSnapshot(`__snapshots__/docx/${testCase.name}/document.xml`);
  await expect(
    prettify(await getZIPEntryContent(entries, "word/styles.xml")),
  ).toMatchFileSnapshot(`__snapshots__/docx/${testCase.name}/styles.xml`);

  // fs.writeFileSync(__dirname + "/My Document.docx", buffer);
};
