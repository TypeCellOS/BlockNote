import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { typstDefaultSchemaMappings } from "@blocknote/xl-typst-exporter";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { describe, expect, it } from "vite-plus/test";
import { PDFExporter } from "./index.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

describe("PDFExporter", () => {
  it("rejects caller assets that collide with exporter-registered ones", async () => {
    const exporter = new PDFExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });

    // The document's image registers `/assets/asset-0`; a caller asset under
    // the same key would be silently shadowed by the merge, so the export
    // must fail loudly instead (before ever reaching the compiler).
    await expect(
      exporter.toBytes(
        partialBlocksToBlocksForTesting(schema, [
          {
            type: "image",
            props: { url: "https://placehold.co/60x60.png", caption: "Cap" },
          },
        ]),
        { assets: new Map([["/assets/asset-0", new Uint8Array([1])]]) },
      ),
    ).rejects.toThrow('the caller-supplied asset "/assets/asset-0" collides');
  });
});
