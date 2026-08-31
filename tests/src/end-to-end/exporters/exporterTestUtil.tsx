import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { expect } from "vite-plus/test";
import { screenshotFull } from "../../utils/screenshotFull.js";

// The exporter e2e files (emailImages / typstPdfImages / reactPdfImages)
// run complete exports of the full shared test document with the default
// mappings in a real browser, where the mappings' `typeof document` checks
// select the built-in image implementations. These are the only tests of
// that composition - the packages' (node) unit suites always take the
// headless side of those checks (or plug in stubs), and the colocated
// `.browser.test` files call the implementations directly, bypassing the
// mappings. A broken default wiring or inverted environment check passes
// every one of those tests and only fails here - while breaking the primary
// real-world path, exporting from the browser. They live in this package
// because they span math-block, diagram-block and the exporters, and this
// is the repo's only browser-mode runner.

// An invalid diagram and an invalid formula, whose typed errors must render
// as placeholders without failing the export. Unlike the packages' node
// suites, this exercises the real error classes through vite's
// bundling/interop of mermaid and mathjax-full - e.g. a mis-resolved
// `TexError` import only breaks here (and in real apps), not in node.
export const invalidDiagramBlock = {
  id: "invalid-diagram",
  type: "diagram",
  props: {},
  content: [{ type: "text", text: "not a valid diagram !!", styles: {} }],
  children: [],
} as any;
export const invalidMathBlock = {
  id: "invalid-math",
  type: "mathBlock",
  props: {},
  // A structural error: MathJax's `noundefined` package renders unknown
  // commands as text rather than erroring, so an unknown command wouldn't
  // reach the error path.
  content: [{ type: "text", text: "\\frac{1}{", styles: {} }],
  children: [],
} as any;

export function schema() {
  return BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs });
}

/**
 * Creates the container an export under test is rendered into. Each test
 * file removes it again via `afterEach(removeExportFrame)`.
 */
export function createExportFrame(width: string) {
  const frame = document.createElement("div");
  frame.id = "export-under-test";
  frame.style.width = width;
  frame.style.background = "white";
  document.body.append(frame);
  return frame;
}

export function removeExportFrame() {
  document.getElementById("export-under-test")?.remove();
}

/**
 * Renders each page of a produced PDF with pdf.js (pure JS - a real browser
 * needs no native canvas dependencies) and screenshots it as its own
 * full-resolution baseline named `${name}-${pageNumber}`.
 */
export async function screenshotPdfPages(
  pdfBytes: Uint8Array,
  name: string,
  options?: Parameters<typeof screenshotFull>[2],
) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const parsed = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
  // The shared test document contains a page break.
  expect(parsed.numPages).toBeGreaterThanOrEqual(2);

  const frame = createExportFrame("fit-content");
  for (let n = 1; n <= parsed.numPages; n++) {
    const pdfPage = await parsed.getPage(n);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.display = "block";
    await pdfPage.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
    } as any).promise;
    frame.replaceChildren(canvas);
    await screenshotFull(frame, `${name}-${n}`, options);
  }
}
