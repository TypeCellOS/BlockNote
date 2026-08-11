import type { ExportImage } from "@blocknote/core";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import { mathjax } from "mathjax-full/js/mathjax.js";

// `mathjax-full` ships CommonJS, and depending on the consumer's bundler
// interop the default import above is either the class itself or a
// `{ default: class }` namespace object (observed with Vite serving the
// package from source). Resolve whichever is the constructor - using the
// namespace directly makes `instanceof` throw "Right-hand side of
// 'instanceof' is not callable" on the first invalid formula.
function isTexError(error: unknown): error is InstanceType<typeof TexError> {
  const texErrorClass: unknown = (TexError as any).default ?? TexError;
  return typeof texErrorClass === "function" && error instanceof texErrorClass;
}
import { SVG } from "mathjax-full/js/output/svg.js";

// Registers the TeX packages listed in `TEX_PACKAGES` below - a curated set
// with roughly KaTeX's coverage (what the editor itself renders), rather
// than `AllPackages`, which would pull every package (mhchem, physics,
// bussproofs, ...) into the bundle.
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import "mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js";
import "mathjax-full/js/input/tex/braket/BraketConfiguration.js";
import "mathjax-full/js/input/tex/cancel/CancelConfiguration.js";
import "mathjax-full/js/input/tex/color/ColorConfiguration.js";
import "mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js";
import "mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js";
import "mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js";
import "mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js";
import "mathjax-full/js/input/tex/unicode/UnicodeConfiguration.js";

const TEX_PACKAGES = [
  "base",
  "ams",
  "boldsymbol",
  "braket",
  "cancel",
  "color",
  "mathtools",
  "newcommand",
  "noundefined",
  "textmacros",
  "unicode",
];

// MathJax (rather than KaTeX, which the math block itself renders with) is
// used for image-based export: its SVG output is self-contained paths, so it
// rasterizes without needing the KaTeX webfonts. `mathjax-full` is an
// optional peer dependency - when exporting math to PDF it's already
// installed transitively via `@react-pdf/math`.
let mathDocument: ReturnType<typeof mathjax.document> | undefined;
let documentAdaptor: ReturnType<typeof liteAdaptor> | undefined;

function getMathDocument() {
  if (!mathDocument || !documentAdaptor) {
    documentAdaptor = liteAdaptor();
    RegisterHTMLHandler(documentAdaptor);
    mathDocument = mathjax.document("", {
      InputJax: new TeX({
        packages: TEX_PACKAGES,
        // MathJax renders TeX errors as error text by default - throw
        // instead, so the conversion boundary in `latexToMathSVG` can return
        // them as typed errors.
        formatError: (_jax: unknown, err: TexError) => {
          throw err;
        },
      }),
      OutputJax: new SVG({ fontCache: "none" }),
    });
  }
  return { mathDocument, documentAdaptor };
}

/**
 * An {@link ExportImage} known to hold SVG markup - what
 * {@link latexToMathSVG} produces and rasterizers consume, so passing a
 * raster image to a rasterizer is a compile-time error.
 */
export type SVGExportImage = ExportImage & { mimeType: "image/svg+xml" };

// The ex height (x-height) of MathJax's font, as a fraction of its em size -
// MathJax sizes its SVG output in `ex` units, and this converts them to the
// target's units via the surrounding font size.
const EX_PER_EM = 0.442;

/**
 * Converts LaTeX to a self-contained {@link SVGExportImage} (via MathJax).
 * Synchronous and environment-independent. Invalid LaTeX is expected (the
 * source is user input), so it's returned as a typed error - with a message
 * safe to show to readers - rather than thrown.
 *
 * The image's `width`/`height` are display dimensions, derived from
 * `fontSize` - the surrounding font's size in the target's units (points,
 * CSS pixels, ...) - and also set as the SVG's intrinsic dimensions, so
 * renderers display it at the right size.
 */
export function latexToMathSVG(
  latex: string,
  options: { inline: boolean; fontSize: number },
): { error?: undefined; image: SVGExportImage } | { error: string } {
  const { mathDocument, documentAdaptor } = getMathDocument();

  let node: unknown;
  try {
    node = mathDocument.convert(latex, { display: !options.inline });
  } catch (error) {
    // The boundary that converts MathJax's TeX-error throw (see
    // `formatError` above) into the typed result. Only `TexError`s are
    // expected (invalid user LaTeX) - anything else is a bug and propagates.
    if (!isTexError(error)) {
      throw error;
    }
    return { error: error.message };
  }

  // The conversion returns an `mjx-container` wrapper; only the `svg`
  // element itself is needed.
  const svgNode = documentAdaptor.firstChild(node as any) as any;
  const widthEx = parseFloat(documentAdaptor.getAttribute(svgNode, "width"));
  const heightEx = parseFloat(documentAdaptor.getAttribute(svgNode, "height"));
  if (
    documentAdaptor.kind(svgNode) !== "svg" ||
    isNaN(widthEx) ||
    isNaN(heightEx)
  ) {
    throw new Error("No SVG found in MathJax output");
  }

  // MathJax sizes the SVG in `ex` units; replace them with explicit pixel
  // dimensions, or renderers fall back to a default size.
  const width = widthEx * options.fontSize * EX_PER_EM;
  const height = heightEx * options.fontSize * EX_PER_EM;
  documentAdaptor.setAttribute(svgNode, "width", Math.ceil(width));
  documentAdaptor.setAttribute(svgNode, "height", Math.ceil(height));

  return {
    image: {
      mimeType: "image/svg+xml",
      data: new TextEncoder().encode(documentAdaptor.outerHTML(svgNode)),
      width,
      height,
    },
  };
}

/**
 * Rasterizes an {@link SVGExportImage} (from {@link latexToMathSVG}) to a
 * raster image - rendered above its display size so it stays sharp in the
 * exported document, at a scale of the implementation's choosing; the
 * returned image keeps the display dimensions. The default implementation
 * ({@link rasterizeSVGInBrowser}) needs a browser; exporters running
 * elsewhere plug in their own (e.g. backed by `@resvg/resvg-js`'s `fitTo`
 * zoom or `sharp`'s density).
 */
export type RasterizeSVG = (svg: SVGExportImage) => Promise<ExportImage>;

const DEFAULT_RASTER_SCALE = 2;

/**
 * Rasterizes an {@link SVGExportImage} to a PNG via a canvas, at `scale`
 * times its display size. The screen's device pixel ratio is deliberately
 * not consulted for the scale, since the output goes into documents, not
 * onto the current screen. Browser-only.
 */
export async function rasterizeSVGInBrowser(
  svg: SVGExportImage,
  scale: number = DEFAULT_RASTER_SCALE,
): Promise<ExportImage> {
  const width = Math.max(1, Math.ceil(svg.width * scale));
  const height = Math.max(1, Math.ceil(svg.height * scale));

  // The scale goes into the SVG's intrinsic dimensions (rather than only
  // the canvas): browsers rasterize an SVG image at its intrinsic size and
  // upscale the bitmap when drawn larger, which would blur the output.
  const svgElement = new DOMParser().parseFromString(
    new TextDecoder().decode(svg.data),
    "image/svg+xml",
  ).documentElement;
  svgElement.setAttribute("width", String(width));
  svgElement.setAttribute("height", String(height));

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(svgElement),
  )}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) {
    throw new Error("Canvas produced no PNG data");
  }

  return {
    mimeType: "image/png",
    data: new Uint8Array(await blob.arrayBuffer()),
    width: svg.width,
    height: svg.height,
  };
}
