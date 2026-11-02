import { createHash } from "node:crypto";
import { Entry, FileEntry, TextWriter, Uint8ArrayWriter } from "@zip.js/zip.js";

// Only for snapshots: docx 9.15.1 uses Word-style image1.gif names instead
// of content hashes (dolanmiu/docx#3872). Resolve the REAL relationships first,
// then snapshot the bytes' hash, preserving both content and extension checks.
export async function readDocumentImages(entries: Entry[]) {
  function readEntry(filename: string) {
    const entry = entries.find(
      (entry): entry is FileEntry =>
        !entry.directory && entry.filename === filename,
    );
    if (!entry?.getData) {
      throw new Error(`Missing DOCX entry: ${filename}`);
    }
    return entry;
  }

  const relationshipsEntry = readEntry("word/_rels/document.xml.rels");
  let relationships = await relationshipsEntry.getData!(new TextWriter());
  const documentEntry = readEntry("word/document.xml");
  const document = await documentEntry.getData!(new TextWriter());
  const imagesById = new Map<string, Uint8Array>();

  for (const [tag] of relationships.matchAll(/<Relationship\b[^>]*\/>/g)) {
    if (
      !tag.includes(
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"',
      )
    ) {
      continue;
    }
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    const extension = target?.match(/^media\/[^/]+\.([a-z]+)$/)?.[1];
    if (
      !id ||
      !target ||
      !extension ||
      tag.includes("TargetMode=") ||
      imagesById.has(id)
    ) {
      throw new Error("Invalid DOCX image relationship");
    }
    const entry = readEntry(`word/${target}`);
    const bytes = await entry.getData!(new Uint8ArrayWriter());
    imagesById.set(id, bytes);
    const hash = createHash("sha1").update(bytes).digest("hex");
    relationships = relationships.replace(
      tag,
      tag.replace(`Target="${target}"`, `Target="media/${hash}.${extension}"`),
    );
  }

  // Check before prettify erases r:embed/Id values. A missing relationship
  // must not turn into a passing snapshot merely because its ID was scrubbed.
  const images = [...document.matchAll(/\br:embed="([^"]+)"/g)].map(
    ([, id]) => {
      const bytes = imagesById.get(id);
      if (!bytes) {
        throw new Error(`Missing DOCX image relationship: ${id}`);
      }
      return bytes;
    },
  );
  return { relationships, images };
}
