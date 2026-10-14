import { TEST_PNG_BYTES } from "@shared/util/testBytesUtil.js";
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

// A stub renderer, standing in for e.g. mermaid-cli on a server - the real
// (browser-only) Mermaid rendering is covered by its `.browser.test`.
export const renderDiagram: RenderDiagram = async () => ({
  image: {
    mimeType: "image/png",
    data: TEST_PNG_BYTES,
    width: 100,
    height: 50,
  },
});

// A renderer reporting the expected failure: invalid Mermaid source.
export const renderInvalidDiagram: RenderDiagram = async () => ({
  error: "No diagram type detected",
});

// An SVG-producing stub, standing in for the browser `renderDiagramToSVG`
// default of the Typst exporter mapping.
export const renderDiagramSVG: RenderDiagram = async () => ({
  image: {
    mimeType: "image/svg+xml",
    data: new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#eee"/><text x="10" y="30">Hi</text></svg>',
    ),
    width: 100,
    height: 50,
  },
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
