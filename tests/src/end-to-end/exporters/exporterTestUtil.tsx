import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { expect } from "vite-plus/test";
import { page } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

// The exporter e2e files (emailImages / typstPdfImages) run complete
// exports of the full shared test document with the default
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
// bundling/interop of Pele and mathjax-full - e.g. a mis-resolved
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

// Includes the multi-column blocks, which the shared test document contains.
// They have to be in the *schema*, not just the mappings: the exporters read
// the schema to tell a layout block from a regular one, and a layout block
// the exporter doesn't recognize gets its children appended after it instead
// of placed by its mapping.
export function schema() {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      column: ColumnBlock,
      columnList: ColumnListBlock,
    },
  });
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
  options?: Parameters<
    ReturnType<typeof expectElement>["toMatchScreenshot"]
  >[1],
) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string),
  ]);
  const previousWorkerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
  const { innerWidth, innerHeight } = window;
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  let loadingTask: ReturnType<typeof pdfjs.getDocument> | undefined;
  let frame: HTMLElement | undefined;
  try {
    loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
    const parsed = await loadingTask.promise;
    // The shared test document contains a page break.
    expect(parsed.numPages).toBeGreaterThanOrEqual(2);

    frame = createExportFrame("fit-content");
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    frame.append(canvas);
    let resized = false;
    for (let n = 1; n <= parsed.numPages; n++) {
      const pdfPage = await parsed.getPage(n);
      const viewport = pdfPage.getViewport({ scale: 1 });
      // Reset the bitmap and context even when consecutive pages are the same size.
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({
        canvasContext: canvas.getContext("2d")!,
        viewport,
      } as any).promise;

      // Keep screenshotFull's capture geometry, but don't shrink and regrow
      // the viewport between pages with the same dimensions.
      const height = Math.max(
        720,
        Math.ceil(frame.getBoundingClientRect().bottom) + 40,
      );
      if (!resized || height !== window.innerHeight) {
        await page.viewport(1280, height);
        resized = true;
      }
      await expectElement(frame).toMatchScreenshot(`${name}-${n}`, options);
    }
  } finally {
    try {
      await loadingTask?.destroy();
    } finally {
      pdfjs.GlobalWorkerOptions.workerSrc = previousWorkerSrc;
      frame?.remove();
      if (
        window.innerWidth !== innerWidth ||
        window.innerHeight !== innerHeight
      ) {
        await page.viewport(innerWidth, innerHeight);
      }
    }
  }
}
