import { afterEach, describe, it, expect, vi } from "vite-plus/test";
import { ReadableByteStreamController as PolyfillController } from "web-streams-polyfill";
import { ReactEmailExporter } from "./reactEmailExporter.jsx";
import { reactEmailDefaultSchemaMappings } from "./defaultSchema/index.js";
import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  type DefaultBlockSchema,
  type DefaultStyleSchema,
  type Link,
  type PartialBlock,
  type Props,
  type StyledText,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "@shared/testDocument.js";

// Schema including the multi-column blocks, matching the shared testDocument.
// The columns are layout blocks, so the exporter only recognizes them as
// such (and lets their mappings place the children) when they're in the
// schema it was constructed with.
const fullSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
    column: ColumnBlock,
    columnList: ColumnListBlock,
  },
});

type InlineBlockType = Extract<
  DefaultBlockSchema[keyof DefaultBlockSchema],
  { content: "inline" }
>["type"];
type Text = StyledText<DefaultStyleSchema>;
type TextLink = Link<DefaultStyleSchema>;

function text(text: string, styles: Text["styles"] = {}): Text {
  return { type: "text", text, styles };
}

function link(href: string, label: string): TextLink {
  return { type: "link", href, content: [text(label)] };
}

function inlineBlock<T extends InlineBlockType>(
  id: string,
  type: T,
  content: string | (Text | TextLink)[],
  {
    props = {},
    children = [],
  }: {
    props?: Partial<Props<DefaultBlockSchema[NoInfer<T>]["propSchema"]>>;
    children?: PartialBlock[];
  } = {},
) {
  return {
    id,
    type,
    content: typeof content === "string" ? [text(content)] : content,
    children,
    props,
  };
}

describe("react email exporter", () => {
  it("should export a document (HTML snapshot)", async () => {
    const exporter = new ReactEmailExporter(
      fullSchema,
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporter");
  });

  it("should export a document with preview", async () => {
    const exporter = new ReactEmailExporter(
      fullSchema,
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any, {
      preview: "This is a preview of the email content",
    });
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterWithPreview");
  });

  it("should export a document with multiple preview lines", async () => {
    const exporter = new ReactEmailExporter(
      fullSchema,
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any, {
      preview: ["First preview line", "Second preview line"],
    });
    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterWithMultiplePreview",
    );
  });

  it("should handle empty document", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument([]);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterEmpty");
  });

  it("should handle document with only text blocks", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const simpleDocument = [
      inlineBlock("1", "paragraph", "Simple text content"),
    ];

    const html = await exporter.toReactEmailDocument(simpleDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterSimpleText");
  });

  it("should handle document with styled text", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const styledDocument = [
      inlineBlock("1", "paragraph", [
        text("Bold and italic text", { bold: true, italic: true }),
      ]),
    ];

    const html = await exporter.toReactEmailDocument(styledDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterStyledText");
  });

  it("should escape HTML characters in text content", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const untrustedDocument = [
      inlineBlock(
        "1",
        "paragraph",
        "x < 10 & y > 20\n<script>alert(1)</script>",
      ),
    ];

    const html = await exporter.toReactEmailDocument(untrustedDocument as any);

    expect(html).not.toContain("<script>");
    expect(html).toContain("x &lt; 10 &amp; y &gt; 20");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // Newlines still become line breaks.
    expect(html).toContain("<br");
  });

  it("should handle document with links", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const linkDocument = [
      inlineBlock("1", "paragraph", [
        link("https://example.com", "Click here"),
      ]),
    ];

    const html = await exporter.toReactEmailDocument(linkDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterWithLinks");
  });

  it("should handle document with nested lists", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const nestedListDocument = [
      inlineBlock("1", "bulletListItem", "Parent item", {
        children: [inlineBlock("2", "bulletListItem", "Child item")],
      }),
    ];

    const html = await exporter.toReactEmailDocument(nestedListDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterNestedLists");
  });

  it("should handle document with mixed content types", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const mixedDocument = [
      inlineBlock("1", "heading", "Main Heading", { props: { level: 1 } }),
      inlineBlock("2", "paragraph", [
        text("Regular paragraph with "),
        text("bold text", { bold: true }),
      ]),
      inlineBlock("3", "numberedListItem", "Numbered list item"),
    ];

    const html = await exporter.toReactEmailDocument(mixedDocument as any);
    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterMixedContent",
    );
  });

  it("should handle document with text alignment", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const alignedDocument = [
      inlineBlock("1", "paragraph", "Center aligned text", {
        props: { textAlignment: "center" },
      }),
      inlineBlock("2", "paragraph", "Right aligned text", {
        props: { textAlignment: "right" },
      }),
    ];

    const html = await exporter.toReactEmailDocument(alignedDocument as any);
    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterTextAlignment",
    );
  });

  it("should handle document with background colors", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const coloredDocument = [
      inlineBlock("1", "paragraph", "Text with background color", {
        props: { backgroundColor: "blue" },
      }),
    ];

    const html = await exporter.toReactEmailDocument(coloredDocument as any);

    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterBackgroundColor",
    );
  });

  it("should handle document with text colors", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const coloredDocument = [
      inlineBlock("1", "paragraph", "Colored text", {
        props: { textColor: "red" },
      }),
    ];

    const html = await exporter.toReactEmailDocument(coloredDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterTextColor");
  });

  it("should handle document with code blocks", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const codeDocument = [
      {
        id: "1",
        type: "codeBlock",
        // Code blocks hold plain content.
        content: [
          {
            type: "text",
            text: "const hello = 'world';\nconsole.log(hello);",
            styles: {},
          },
        ],
        children: [],
        props: { language: "javascript" },
      },
    ];

    const html = await exporter.toReactEmailDocument(codeDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterCodeBlock");
  });

  it("should handle document with check list items", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const checkListDocument = [
      inlineBlock("1", "checkListItem", "Checked item", {
        props: { checked: true },
      }),
      inlineBlock("2", "checkListItem", "Unchecked item", {
        props: { checked: false },
      }),
    ];

    const html = await exporter.toReactEmailDocument(checkListDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterCheckList");
  });

  it("should handle document with headings of different levels", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const headingDocument = [
      inlineBlock("1", "heading", "Heading 1", { props: { level: 1 } }),
      inlineBlock("2", "heading", "Heading 2", { props: { level: 2 } }),
      inlineBlock("3", "heading", "Heading 3", { props: { level: 3 } }),
    ];

    const html = await exporter.toReactEmailDocument(headingDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterHeadings");
  });

  it("should handle document with complex nested structure", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const complexDocument = [
      inlineBlock("1", "heading", [text("Complex Document", { bold: true })], {
        props: { level: 1 },
      }),
      inlineBlock(
        "2",
        "paragraph",
        [
          text("This is a paragraph with "),
          text("bold", { bold: true }),
          text(" and "),
          text("italic", { italic: true }),
          text(" text, plus a "),
          link("https://example.com", "link"),
          text("."),
        ],
        { props: { textAlignment: "center" } },
      ),
      inlineBlock("3", "bulletListItem", "List item with nested content", {
        children: [
          inlineBlock("4", "paragraph", "Nested paragraph"),
          inlineBlock("5", "numberedListItem", "Nested numbered item"),
        ],
      }),
    ];

    const html = await exporter.toReactEmailDocument(complexDocument as any);

    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterComplexNested",
    );
  });

  it("should handle document with mixed list types", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const mixedListDocument = [
      inlineBlock("1", "bulletListItem", "Bullet item 1"),
      inlineBlock("2", "bulletListItem", "Bullet item 2"),
      inlineBlock("3", "numberedListItem", "Numbered item 1"),
      inlineBlock("4", "numberedListItem", "Numbered item 2"),
    ];

    const html = await exporter.toReactEmailDocument(mixedListDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterMixedLists");
  });

  it("should handle document with custom body styles", async () => {
    const exporter = new ReactEmailExporter(
      fullSchema,
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any, {
      bodyStyles: { fontFamily: "Arial, sans-serif" },
    });

    expect(html).toMatchSnapshot(
      "__snapshots__/reactEmailExporterCustomBodyStyles",
    );
  });

  describe("byte stream controller", () => {
    const nativeController = globalThis.ReadableByteStreamController;

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("installs the ponyfill's named export while rendering without a native byte stream controller", async () => {
      vi.stubGlobal("ReadableByteStreamController", undefined);
      const exporter = new ReactEmailExporter(
        BlockNoteSchema.create(),
        reactEmailDefaultSchemaMappings,
      );
      const container = vi.fn(function Container() {
        expect(globalThis.ReadableByteStreamController).toBe(
          PolyfillController,
        );
        return <p>Safari polyfill render</p>;
      });

      const html = await exporter.toReactEmailDocument([], { container });

      expect(container).toHaveBeenCalled();
      expect(html).toContain("Safari polyfill render");
      expect(globalThis.ReadableByteStreamController).toBeUndefined();
    });

    it("preserves an existing native byte stream controller during and after rendering", async () => {
      expect(typeof nativeController).toBe("function");
      vi.stubGlobal("ReadableByteStreamController", nativeController);
      const exporter = new ReactEmailExporter(
        BlockNoteSchema.create(),
        reactEmailDefaultSchemaMappings,
      );
      const container = vi.fn(function Container() {
        expect(globalThis.ReadableByteStreamController).toBe(nativeController);
        return <p>Native stream render</p>;
      });

      const html = await exporter.toReactEmailDocument([], { container });

      expect(container).toHaveBeenCalled();
      expect(html).toContain("Native stream render");
      expect(globalThis.ReadableByteStreamController).toBe(nativeController);
    });
  });
});
