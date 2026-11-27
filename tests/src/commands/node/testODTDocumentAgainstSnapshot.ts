import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";
import { expect } from "vite-plus/test";
import xmlFormat from "xml-formatter";

/**
 * Verifies an exported ODT document against file snapshots: `styles.xml`,
 * `content.xml`, and the embedded objects (the sub-documents that e.g.
 * formulas are stored in, as separate `Object N/content.xml` zip entries).
 * Tests that don't declare `objects` assert the document embeds none, so
 * object payloads can't go unverified.
 */
export async function testODTDocumentAgainstSnapshot(
  odt: Blob,
  snapshots: {
    styles: string;
    content: string;
    objects?: { snapshot: string; expectedCount: number };
  },
) {
  const zipReader = new ZipReader(new BlobReader(odt));
  const entries = await zipReader.getEntries();
  const stylesXML = entries.find(
    (entry) => entry.filename === "styles.xml",
  ) as FileEntry;
  const contentXML = entries.find(
    (entry) => entry.filename === "content.xml",
  ) as FileEntry;

  expect(stylesXML).toBeDefined();
  expect(contentXML).toBeDefined();
  await expect(
    xmlFormat(await stylesXML.getData(new TextWriter())),
  ).toMatchFileSnapshot(snapshots.styles);
  await expect(
    xmlFormat(await contentXML.getData(new TextWriter())),
  ).toMatchFileSnapshot(snapshots.content);

  const objectEntries = entries
    .filter((entry) => /^Object \d+\/content\.xml$/.test(entry.filename))
    .sort((a, b) => a.filename.localeCompare(b.filename)) as FileEntry[];
  expect(objectEntries).toHaveLength(snapshots.objects?.expectedCount ?? 0);

  if (snapshots.objects) {
    const objectContents = await Promise.all(
      objectEntries.map(
        async (entry) =>
          `<!-- ${entry.filename} -->\n` +
          xmlFormat(await entry.getData(new TextWriter())),
      ),
    );
    await expect(objectContents.join("\n")).toMatchFileSnapshot(
      snapshots.objects.snapshot,
    );
  }
}
