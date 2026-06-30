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
import { describe, expect, it } from "vite-plus/test";
import { typstDefaultSchemaMappings } from "../typst/defaultSchema/index.js";
import { TypstExporter } from "../typst/typstExporter.js";

// TODO: review or make part of other test

// The same fonts the golden test uses (Inter + Geist Mono + color emoji).
function fontBlobs(): Buffer[] {
  const shared = "../../shared/assets/fonts";
  return [
    `${shared}/inter/Inter_18pt-Regular.ttf`,
    `${shared}/inter/Inter_18pt-Italic.ttf`,
    `${shared}/inter/Inter_18pt-Bold.ttf`,
    `${shared}/inter/Inter_18pt-BoldItalic.ttf`,
    `${shared}/GeistMono-Regular.ttf`,
    "src/pdfua/__fixtures__/Noto-COLRv1.ttf",
  ].map((p) => Buffer.from(readFileSync(resolve(process.cwd(), p))));
}

// A deterministic 1×1 grey PNG, returned for every image URL so the rendered
// snapshot doesn't depend on network image fetches.
const STUB_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

function pdftoppmAvailable(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("visual regression: BlockNote testDocument render", () => {
  it("renders to stable per-page PNG snapshots", async () => {
    // Visual snapshots need a PDF rasterizer; skip cleanly where it's absent.
    if (!pdftoppmAvailable()) {
      return;
    }

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
      {
        emojiFontFamily: "Noto Color Emoji",
        // Resolve every image to the same stub so the render is deterministic.
        resolveFileUrl: async () => STUB_IMAGE,
      },
    );
    const typ = await exporter.toTypst(testDocument, {
      title: "BlockNote Export",
      lang: "en",
      author: "BlockNote",
    });

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
    const pdf = Buffer.from(
      compiler.pdf({ mainFileContent: typ }, { creationTimestamp: 1 }),
    );

    // Rasterize the PDF to one PNG per page.
    const dir = mkdtempSync(join(tmpdir(), "bn-visual-"));
    writeFileSync(join(dir, "doc.pdf"), pdf);
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
  }, 30000);
});
