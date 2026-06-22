import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vite-plus/test";
import { typstDefaultSchemaMappings } from "../typst/defaultSchema/index.js";
import { TypstExporter } from "../typst/typstExporter.js";
import { declarePdfUA } from "./postProcess.js";

// The fonts the exporter references (Inter 18pt + Geist Mono), from the shared
// assets, plus an emoji font so emoji don't render as `.notdef`.
function fontBlobs(): Buffer[] {
  const shared = "../../shared/assets/fonts";
  const paths = [
    `${shared}/inter/Inter_18pt-Regular.ttf`,
    `${shared}/inter/Inter_18pt-Italic.ttf`,
    `${shared}/inter/Inter_18pt-Bold.ttf`,
    `${shared}/inter/Inter_18pt-BoldItalic.ttf`,
    `${shared}/GeistMono-Regular.ttf`,
    "src/pdfua/__fixtures__/NotoEmoji-Regular.ttf",
  ];
  return paths.map((p) => Buffer.from(readFileSync(resolve(process.cwd(), p))));
}

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

describe("golden: BlockNote -> Typst -> tagged PDF -> PDF/UA-1", () => {
  it("produces a declared, structurally-tagged PDF/UA-1 document", async () => {
    // 1) exporter -> Typst
    const exporter = new TypstExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      typstDefaultSchemaMappings,
      { title: "BlockNote Export", lang: "en", author: "BlockNote" },
    );
    const typ = await exporter.toTypst(testDocument);

    // 2) compile to a *tagged* PDF (no UA flag), mirroring the browser path.
    //    An emoji font is supplied so emoji don't render as `.notdef`.
    const { NodeCompiler } =
      await import("@myriaddreamin/typst-ts-node-compiler");
    const compiler = NodeCompiler.create({
      fontArgs: [{ fontBlobs: fontBlobs() }],
    });
    const tagged = compiler.pdf(
      { mainFileContent: typ },
      { creationTimestamp: 1_700_000_000 },
    );

    // 3) declare PDF/UA-1 via our post-process
    const ua = await declarePdfUA(new Uint8Array(tagged));

    // 4) deterministic structural assertions (no external tooling)
    const doc = await PDFDocument.load(ua, { updateMetadata: false });
    expect(doc.catalog.get(PDFName.of("StructTreeRoot"))).toBeDefined();
    const vp = doc.catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict);
    expect(String(vp!.get(PDFName.of("DisplayDocTitle")))).toBe("true");

    // 5) full conformance gate when veraPDF is available
    const verdict = veraPdfVerdict(ua);
    if (verdict !== undefined) {
      expect(verdict).toContain('isCompliant="true"');
      expect(verdict).toContain('failedChecks="0"');
    }
  }, 30000);
});
