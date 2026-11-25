import {
  BlobReader,
  BlobWriter,
  TextReader,
  Uint8ArrayReader,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";
import { describe, expect, it } from "vite-plus/test";
import { readDocumentImages } from "./imageRelationships.testUtil.js";

const imageType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

async function imageArchive(
  target: string,
  {
    embed = "rId1",
    includeMedia = true,
    bytes = new Uint8Array([97, 98, 99]),
  } = {},
) {
  const zip = new ZipWriter(new BlobWriter());
  await zip.add(
    "word/document.xml",
    new TextReader(`<a:blip r:embed="${embed}"/>`),
  );
  await zip.add(
    "word/_rels/document.xml.rels",
    new TextReader(
      `<Relationships><Relationship Id="rId1" Type="${imageType}" Target="${target}"/></Relationships>`,
    ),
  );
  if (includeMedia) {
    await zip.add(`word/${target}`, new Uint8ArrayReader(bytes));
  }
  return new ZipReader(new BlobReader(await zip.close())).getEntries();
}

describe("image relationship snapshots", () => {
  const hashTarget = "media/a9993e364706816aba3e25717850c26c9cd0d89d.gif";

  it("compares archived bytes independently of docx's media naming scheme", async () => {
    const hashed = await readDocumentImages(await imageArchive(hashTarget));
    const numbered = await readDocumentImages(
      await imageArchive("media/image1.gif"),
    );
    expect(numbered).toEqual(hashed);
    expect(numbered.relationships).toContain(`Target="${hashTarget}"`);
    expect(numbered.images).toEqual([new Uint8Array([97, 98, 99])]);
  });

  it("does not hide changed image bytes behind a stable filename", async () => {
    const original = await readDocumentImages(
      await imageArchive("media/image1.gif"),
    );
    const changed = await readDocumentImages(
      await imageArchive("media/image1.gif", {
        bytes: new Uint8Array([100, 101, 102]),
      }),
    );
    expect(changed.relationships).not.toBe(original.relationships);
    expect(changed.images).not.toEqual(original.images);
  });

  it("preserves image extensions in the snapshot", async () => {
    const result = await readDocumentImages(
      await imageArchive("media/image1.png"),
    );
    expect(result.relationships).toContain(hashTarget.replace(".gif", ".png"));
  });

  it("rejects a relationship whose target is missing from the archive", async () => {
    await expect(
      readDocumentImages(
        await imageArchive("media/image1.gif", {
          includeMedia: false,
        }),
      ),
    ).rejects.toThrow("Missing DOCX entry: word/media/image1.gif");
  });

  it("rejects a drawing whose raw relationship ID does not resolve", async () => {
    await expect(
      readDocumentImages(
        await imageArchive("media/image1.gif", {
          embed: "rIdMissing",
        }),
      ),
    ).rejects.toThrow("Missing DOCX image relationship: rIdMissing");
  });
});
