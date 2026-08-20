import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { PDFDict, PDFDocument, PDFName } from "@cantoo/pdf-lib";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "@shared/testDocument.js";
import { toMatchBinaryFileSnapshot } from "@shared/util/binaryFileSnapshotUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { compileTypstForTesting } from "@shared/util/typstTestUtil.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

// These tests are gates, and a gate whose tooling is missing must fail
// loudly - a silent pass would report conformance/visual coverage that was
// never checked.
function requireTool(command: string, args: string[], installHint: string) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
  } catch {
    throw new Error(
      `\`${command}\` is required by this test but not on PATH. ${installHint}`,
    );
  }
}

function veraPdfVerdict(pdf: Uint8Array): string {
  requireTool(
    "verapdf",
    ["--version"],
    "Install veraPDF (https://verapdf.org) - it is the PDF/UA conformance gate.",
  );
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

// Compiles the shared test document once (with the network-free test image
// resolver), then asserts both PDF/UA-1 conformance and a per-page visual
// snapshot off the same render.
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
      // font bytes are loaded via fontBlobs()); the shared test resolver keeps
      // the render deterministic and network-free.
      {
        emojiFontFamily: "Noto Color Emoji",
        resolveFileUrl: testResolveFileUrl,
      },
    );
    const typ = await exporter.toTypst(testDocument, {
      title: "BlockNote Export",
      lang: "en",
      author: "BlockNote",
    });

    // Compile to a *tagged* PDF (no UA flag), mirroring the browser path.
    tagged = Buffer.from(
      await compileTypstForTesting(typ, {
        assets: exporter.assetFiles,
        fontBlobs: fontBlobs(),
        creationTimestamp: 1_700_000_000,
      }),
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

    // Full conformance gate.
    const verdict = veraPdfVerdict(ua);
    expect(verdict).toContain('isCompliant="true"');
    expect(verdict).toContain('failedChecks="0"');
  });

  it("matches the per-page visual snapshot", async () => {
    requireTool(
      "pdftoppm",
      ["-v"],
      "Install poppler (`brew install poppler` / `apt install poppler-utils`) - it rasterizes the visual snapshots.",
    );
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

    // Compare each page against its committed baseline PNG; on mismatch the
    // received render is dumped next to the baseline for inspection.
    for (let i = 0; i < pages.length; i++) {
      await toMatchBinaryFileSnapshot(
        readFileSync(join(dir, pages[i])),
        resolve(
          process.cwd(),
          `src/pdfua/__snapshots__/render/testDocument-${i + 1}.png`,
        ),
        { writeActualOnMismatch: true },
      );
    }
  });
});
