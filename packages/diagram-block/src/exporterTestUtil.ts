import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";

import type { RenderDiagram } from "./helpers/renderDiagramToImage.js";

export const diagramDocument = [
  {
    id: "1",
    type: "diagram",
    props: {},
    content: [
      { type: "text", text: "graph TD\n  A[Start] --> B[End]", styles: {} },
    ],
    children: [],
  },
] as any;

// A real (1x1 transparent) PNG: some export paths probe the image bytes for
// metadata, so stub images must be actual PNGs.
const pngBytes = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

// A stub renderer, standing in for e.g. mermaid-cli on a server - the real
// (browser-only) Mermaid rendering is covered by its `.browser.test`.
export const renderDiagram: RenderDiagram = async () => ({
  image: {
    mimeType: "image/png",
    data: pngBytes,
    width: 100,
    height: 50,
  },
});

// A renderer reporting the expected failure: invalid Mermaid source.
export const renderInvalidDiagram: RenderDiagram = async () => ({
  error: "No diagram type detected",
});

export async function zipEntryContent(
  zip: globalThis.Blob,
  filename: string,
): Promise<string> {
  const entries = await new ZipReader(new BlobReader(zip)).getEntries();
  const entry = entries.find((e) => e.filename === filename && !e.directory) as
    | FileEntry
    | undefined;
  return entry ? await entry.getData(new TextWriter()) : "";
}
