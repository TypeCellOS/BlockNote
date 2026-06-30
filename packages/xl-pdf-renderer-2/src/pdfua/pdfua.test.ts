import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "@shared/testDocument.js";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { typstDefaultSchemaMappings } from "../typst/defaultSchema/index.js";
import { TypstExporter } from "../typst/typstExporter.js";
import { declarePdfUA } from "./postProcess.js";

// The fonts the exporter references (Inter 18pt + Geist Mono), from the shared
// assets, plus a color emoji font (Noto Color Emoji, pure-COLRv1) so emoji
// render in color rather than as `.notdef` — matching the example.
function fontBlobs(): Buffer[] {
  const shared = "../../shared/assets/fonts";
  const paths = [
    `${shared}/inter/Inter_18pt-Regular.ttf`,
    `${shared}/inter/Inter_18pt-Italic.ttf`,
    `${shared}/inter/Inter_18pt-Bold.ttf`,
    `${shared}/inter/Inter_18pt-BoldItalic.ttf`,
    `${shared}/GeistMono-Regular.ttf`,
    "src/pdfua/__fixtures__/Noto-COLRv1.ttf",
  ];
  return paths.map((p) => Buffer.from(readFileSync(resolve(process.cwd(), p))));
}

// A deterministic 1×1 grey PNG, returned for every image URL so the compiled
// output (its veraPDF verdict and visual snapshot) doesn't depend on network
// image fetches. Real image fetching/embedding is covered by typstExporter.test.
const STUB_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

function veraPdfVerdict(pdf: Uint8Array): string | undefined {
  try {
    execFileSync("verapdf", ["--version"], { stdio: "ignore" });
  } catch {
    return undefined; // veraPDF not installed -> skip the conformance gate
  }
  const dir = mkdtempSync(join(tmpdir(), "pdfua-"));
  const file = join(dir, "out.pdf");
  writeFileSync(file, pdf);
  try {
    return execFileSync("verapdf", ["--flavour", "ua1", file], {
      encoding: "utf8",
      maxBuffer: 1e8,
    });
  } catch (e: any) {
    return e.stdout?.toString() ?? ""; // non-zero exit on non-conformance
  }
}

function pdftoppmAvailable(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Compiles the shared test document once (with deterministic stub images), then
// asserts both PDF/UA-1 conformance and a per-page visual snapshot off the same
// render.
describe("pdf/ua-1: BlockNote -> Typst -> PDF (conformance + visual)", () => {
  let tagged: Buffer;
  let ua: Uint8Array;

  beforeAll(async () => {
    const exporter = new TypstExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
          column: ColumnBlock,
          columnList: ColumnListBlock,
        },
      }),
      typstDefaultSchemaMappings,
      // List the color emoji font explicitly so ZWJ emoji shape correctly (the
      // font bytes are loaded via fontBlobs()); stub images for determinism.
      {
        emojiFontFamily: "Noto Color Emoji",
        resolveFileUrl: async () => STUB_IMAGE,
      },
    );
    const typ = await exporter.toTypst(testDocument, {
      title: "BlockNote Export",
      lang: "en",
      author: "BlockNote",
    });

    // Compile to a *tagged* PDF (no UA flag), mirroring the browser path. The
    // collected images are mapped into the compiler's virtual filesystem. The
    // node compiler resolves a project-absolute Typst path (`/assets/..`) against
    // the cwd, so key the shadow by that resolved absolute path. (The browser
    // path in `compileBrowser.ts` uses the `/assets/..` virtual path directly.)
    const { NodeCompiler } =
      await import("@myriaddreamin/typst-ts-node-compiler");
    const compiler = NodeCompiler.create({
      fontArgs: [{ fontBlobs: fontBlobs() }],
    });
    for (const [path, bytes] of exporter.assetFiles) {
      compiler.mapShadow(
        resolve(process.cwd(), path.replace(/^\/+/, "")),
        Buffer.from(bytes),
      );
    }
    tagged = Buffer.from(
      compiler.pdf(
        { mainFileContent: typ },
        { creationTimestamp: 1_700_000_000 },
      ),
    );
    // Declare PDF/UA-1 via our post-process.
    ua = await declarePdfUA(new Uint8Array(tagged));
  }, 30000);

  it("produces a declared, structurally-tagged, veraPDF-conformant document", async () => {
    // Deterministic structural assertions (no external tooling).
    const doc = await PDFDocument.load(ua, { updateMetadata: false });
    expect(doc.catalog.get(PDFName.of("StructTreeRoot"))).toBeDefined();
    const vp = doc.catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict);
    expect(String(vp!.get(PDFName.of("DisplayDocTitle")))).toBe("true");

    // Full conformance gate when veraPDF is available.
    const verdict = veraPdfVerdict(ua);
    if (verdict !== undefined) {
      expect(verdict).toContain('isCompliant="true"');
      expect(verdict).toContain('failedChecks="0"');
    }
  });

  it("matches the per-page visual snapshot", () => {
    // Visual snapshots need a PDF rasterizer; skip cleanly where it's absent.
    if (!pdftoppmAvailable()) {
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "bn-visual-"));
    writeFileSync(join(dir, "doc.pdf"), tagged);
    execFileSync("pdftoppm", [
      "-png",
      "-r",
      "96",
      join(dir, "doc.pdf"),
      join(dir, "page"),
    ]);
    const pages = readdirSync(dir)
      .filter((f) => f.endsWith(".png"))
      .sort();
    expect(pages.length).toBeGreaterThan(0);

    // Compare each page against its committed baseline PNG. `-u` (or a missing
    // baseline) writes the image; otherwise a byte mismatch fails the test and
    // dumps an `.actual.png` next to the baseline for inspection.
    const update =
      (
        expect.getState() as unknown as {
          snapshotState?: { _updateSnapshot?: string };
        }
      ).snapshotState?._updateSnapshot ?? "new";
    for (let i = 0; i < pages.length; i++) {
      const png = readFileSync(join(dir, pages[i]));
      const snap = resolve(
        process.cwd(),
        `src/pdfua/__snapshots__/render/testDocument-${i + 1}.png`,
      );
      if (!existsSync(snap) || update === "all") {
        mkdirSync(dirname(snap), { recursive: true });
        writeFileSync(snap, png);
        continue;
      }
      const baseline = readFileSync(snap);
      if (!png.equals(baseline)) {
        writeFileSync(snap.replace(/\.png$/, ".actual.png"), png);
      }
      expect(
        png.equals(baseline),
        `page ${i + 1} render differs from baseline (see .actual.png)`,
      ).toBe(true);
    }
  });
});
