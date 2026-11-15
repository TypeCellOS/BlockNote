import { BlockNoteSchema, createBlockSpec, type Block } from "@blocknote/core";
import {
  DOCXExporter,
  docxDefaultSchemaMappings,
} from "@blocknote/xl-docx-exporter";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import {
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-typst-exporter";
import { PDFExporter } from "@blocknote/xl-pdf-exporter";
import {
  PDFExporter as LegacyPDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter/react-pdf";
import { Document as WordDocument, Packer, Paragraph } from "docx";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { embedBlockSpecs } from "../embedBlockSpecs.js";
import * as docx from "../docx-exporter/index.js";
import * as odt from "../odt-exporter/index.js";
import * as email from "../email-exporter/index.js";
import * as typst from "../typst-exporter/index.js";
import * as legacyPDF from "../pdf-exporter/index.js";

// Real custom schema composition: no untyped fixture casts or fake editor ports.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...embedBlockSpecs,
    custom: createBlockSpec(
      { type: "custom", propSchema: {}, content: "none" },
      {
        render() {
          throw new Error("Editor rendering must not run during export");
        },
      },
    )(),
  },
});
type DocumentBlock = Block<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;
const source = "https://EXAMPLE.org/article?x=1&y=%22quoted%22#part";
const title = 'Saved <title> & "quotes" [#panic()]';
const description = 'Description <script> & "literal"';
const child: DocumentBlock = {
  id: "child",
  type: "custom",
  props: {},
  content: undefined,
  children: [],
};
const blocks: DocumentBlock[] = [
  {
    id: "bookmark",
    type: "bookmark",
    props: {
      originalUrl: source,
      title,
      description,
      imageUrl: "https://images.example/thumbnail.png",
    },
    content: undefined,
    children: [child],
  },
  {
    id: "embed",
    type: "embed",
    props: {
      originalUrl: "https://video.example/watch?a=1&b=2",
      providerId: "not-registered",
    },
    content: undefined,
    children: [],
  },
  {
    id: "fallback",
    type: "bookmark",
    props: {
      originalUrl: "https://plain.example",
      title: "",
      description: "",
      imageUrl: "",
    },
    content: undefined,
    children: [],
  },
  {
    id: "unsafe-bookmark",
    type: "bookmark",
    props: {
      originalUrl: "javascript:alert(1)",
      title: "Unsafe source <saved>",
      description: "Still saved",
      imageUrl: "https://images.example/other.png",
    },
    content: undefined,
    children: [],
  },
  {
    id: "unsafe-embed",
    type: "embed",
    props: { originalUrl: "https:ambiguous.example", providerId: "anything" },
    content: undefined,
    children: [],
  },
  {
    id: "empty-embed",
    type: "embed",
    props: { originalUrl: "", providerId: "" },
    content: undefined,
    children: [],
  },
];

async function zipText(blob: Blob, name: string) {
  const zip = new ZipReader(new BlobReader(blob));
  try {
    const entry = (await zip.getEntries()).find(
      (entry) => entry.filename === name,
    );
    if (!entry || entry.directory) {
      throw new Error(`Missing ZIP entry ${name}`);
    }
    return await entry.getData(new TextWriter());
  } finally {
    await zip.close();
  }
}

// ODT font embedding is the engine's separate policy, not a mapping behavior.
// Suppress only that unrelated local-asset step to assert truly fetch-free mappings.
class TextOnlyODTExporter extends ODTExporter<
  typeof schema.blockSchema,
  typeof schema.styleSchema,
  typeof schema.inlineContentSchema
> {
  protected override async loadFonts() {
    return [];
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("opt-in embeds exporter mappings", () => {
  function forbidFetching() {
    const nativeFetch = globalThis.fetch;
    const fetch = vi.fn(() => {
      throw new Error("These saved text exports must not fetch resources");
    });
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      // Some engines load their shipped WASM through data/file URLs. This is
      // not provider/image resolution and is outside the mapping's policy.
      if (url.startsWith("data:") || url.startsWith("file:")) {
        return nativeFetch(input, init);
      }
      return fetch();
    });
    return fetch;
  }
  it("composes DOCX mappings and writes native hyperlinks, escaped metadata, fallbacks and children once", async () => {
    const fetch = forbidFetching();
    const exporter = new DOCXExporter(schema, {
      ...docxDefaultSchemaMappings,
      blockMapping: {
        ...docxDefaultSchemaMappings.blockMapping,
        bookmark: docx.bookmarkBlockMapping,
        embed: docx.embedBlockMapping,
        custom: () => new Paragraph("Custom child"),
      },
    });
    const document = new WordDocument({
      sections: [{ children: await exporter.transformBlocks(blocks) }],
    });
    const blob = await Packer.toBlob(document);
    const xml = await zipText(blob, "word/document.xml");
    const relationships = await zipText(blob, "word/_rels/document.xml.rels");
    expect(xml).toContain(
      "Saved &lt;title&gt; &amp; &quot;quotes&quot; [#panic()]",
    );
    expect(xml).toContain(
      "Description &lt;script&gt; &amp; &quot;literal&quot;",
    );
    expect(xml).toContain(source.replaceAll("&", "&amp;"));
    expect(xml).toContain("https://video.example/watch?a=1&amp;b=2");
    expect(xml).toContain("https://plain.example");
    expect(xml).toContain("javascript:alert(1)");
    expect(xml).toContain("https:ambiguous.example");
    expect(xml).toContain("Invalid source URL");
    expect(xml.match(/Custom child/g)).toHaveLength(1);
    expect(relationships).toContain(
      source.split("#")[0].replaceAll("&", "&amp;"),
    );
    expect(xml).toContain('w:anchor="part"');
    expect(relationships).not.toContain("javascript:");
    expect(relationships).not.toContain("https:ambiguous");
    expect(xml).not.toContain("<w:drawing");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("composes ODT mappings into real ODF text/links, not upstream HTML or images", async () => {
    const fetch = forbidFetching();
    const exporter = new TextOnlyODTExporter(schema, {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        bookmark: odt.bookmarkBlockMapping,
        embed: odt.embedBlockMapping,
        custom: (block) =>
          createElement("text:p", { key: block.id }, "Custom child"),
      },
    });
    const xml = await zipText(
      await exporter.toODTDocument(blocks),
      "content.xml",
    );
    expect(xml).toContain(
      "Saved &lt;title&gt; &amp; &quot;quotes&quot; [#panic()]",
    );
    expect(xml).toContain(
      "Description &lt;script&gt; &amp; &quot;literal&quot;",
    );
    expect(xml).toContain(`xlink:href="${source.replaceAll("&", "&amp;")}"`);
    expect(xml).toContain("https://video.example/watch?a=1&amp;b=2");
    expect(xml).toContain("https://plain.example");
    expect(xml).toContain("javascript:alert(1)");
    expect(xml).not.toContain('xlink:href="javascript:');
    expect(xml).not.toContain('xlink:href="https:ambiguous');
    expect(xml.match(/Custom child/g)).toHaveLength(1);
    expect(xml).not.toContain("<draw:image");
    expect(xml).not.toContain("thumbnail.png");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("composes email mappings with escaped saved text and visible source links without fetching thumbnails", async () => {
    const fetch = forbidFetching();
    const exporter = new ReactEmailExporter(schema, {
      ...reactEmailDefaultSchemaMappings,
      blockMapping: {
        ...reactEmailDefaultSchemaMappings.blockMapping,
        bookmark: email.bookmarkBlockMapping,
        embed: email.embedBlockMapping,
        custom: () => <p>Custom child</p>,
      },
    });
    const html = await exporter.toReactEmailDocument(blocks);
    expect(html).toContain(
      "Saved &lt;title&gt; &amp; &quot;quotes&quot; [#panic()]",
    );
    expect(html).toContain(`href="${source.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(
      "Description &lt;script&gt; &amp; &quot;literal&quot;",
    );
    expect(html).toContain("https://video.example/watch?a=1&amp;b=2");
    expect(html).toContain("https://plain.example");
    expect(html).toContain("javascript:alert(1)");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="https:ambiguous');
    expect(html.match(/Custom child/g)).toHaveLength(1);
    expect(html).not.toMatch(/<(img|iframe|script)\b/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("composes Typst mappings with string-literal escaping and inactive unsafe sources", async () => {
    const fetch = forbidFetching();
    const exporter = new TypstExporter(schema, {
      ...typstDefaultSchemaMappings,
      blockMapping: {
        ...typstDefaultSchemaMappings.blockMapping,
        bookmark: typst.bookmarkBlockMapping,
        embed: typst.embedBlockMapping,
        custom: () => '#"Custom child"',
      },
    });
    const output = await exporter.toTypst(blocks, { title: "Saved embeds" });
    expect(output).toContain(
      `#link(${JSON.stringify(source)})[#${JSON.stringify(title)}]`,
    );
    expect(output).toContain(`#${JSON.stringify(description)}`);
    expect(output).toContain(`[#${JSON.stringify(source)}]`);
    expect(output).toContain('#link("https://video.example/watch?a=1&b=2")');
    expect(output).toContain('#link("https://plain.example")');
    expect(output).toContain('#"javascript:alert(1)"');
    expect(output).not.toContain('#link("javascript:');
    expect(output).not.toContain('#link("https:ambiguous');
    expect(output.match(/Custom child/g)).toHaveLength(1);
    expect(exporter.assetFiles.size).toBe(1); // Engine's bundled code theme only.
    expect(fetch).not.toHaveBeenCalled();
  });
  it(
    "uses the same Typst mappings for current PDF and compiles native link annotations offline",
    { timeout: 20000 },
    async () => {
      const fetch = forbidFetching();
      const exporter = new PDFExporter(
        schema,
        {
          ...typstDefaultSchemaMappings,
          blockMapping: {
            ...typstDefaultSchemaMappings.blockMapping,
            bookmark: typst.bookmarkBlockMapping,
            embed: typst.embedBlockMapping,
            custom: () => '#"Custom child"',
          },
        },
        {
          wasm: readFileSync(
            new URL(
              "../../../xl-typst-compiler/pkg/blocknote_typst_wasm_bg.wasm",
              import.meta.url,
            ),
          ),
          fonts: [
            readFileSync(
              new URL(
                "../../../../shared/assets/fonts/inter/Inter_18pt-Regular.ttf",
                import.meta.url,
              ),
            ),
          ],
          emojiFont: [],
          emojiFontFamily: undefined,
        },
      );
      const result = await exporter.toPDF(blocks, {
        title: "Saved embeds",
        lang: "en",
      });
      if (result.error) {
        throw new Error(JSON.stringify(result.compileErrors));
      }
      const pdf = new TextDecoder("latin1").decode(result.bytes);
      expect(pdf).toMatch(/\/Subtype\s*\/Link/);
      expect(pdf).toContain(source);
      expect(pdf).not.toContain("javascript:alert");
      expect(result.pdfUA.declared).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("keeps legacy react-pdf mappings distinct and writes clickable links without provider/image rendering", async () => {
    const fetch = forbidFetching();
    const exporter = new LegacyPDFExporter(schema, {
      ...pdfDefaultSchemaMappings,
      blockMapping: {
        ...pdfDefaultSchemaMappings.blockMapping,
        bookmark: legacyPDF.bookmarkBlockMapping,
        embed: legacyPDF.embedBlockMapping,
        custom: () => <Text>Custom child</Text>,
      },
    });
    // Engine font registration is separate; built-in Helvetica keeps this test offline.
    const pdf = await renderToBuffer(
      <Document>
        <Page style={{ fontFamily: "Helvetica" }}>
          {await exporter.transformBlocks(blocks)}
        </Page>
      </Document>,
    );
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text).toMatch(/\/Subtype\s*\/Link/);
    expect(text).toContain(source);
    expect(text).toContain("https://video.example/watch?a=1&b=2");
    expect(text).not.toContain("javascript:alert");
    expect(fetch).not.toHaveBeenCalled();
  });
});
