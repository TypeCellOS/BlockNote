import { describe, it, expect } from "vitest";
import { ReactEmailExporter } from "./reactEmailExporter.jsx";
import { reactEmailDefaultSchemaMappings } from "./defaultSchema/index.js";
import {
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  PageBreak,
} from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";

describe("react email exporter", () => {
  it("should export a document (HTML snapshot)", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporter");
  });

  it("typescript: schema with extra block", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: PageBreak,
        extraBlock: createBlockSpec(
          {
            content: "none",
            type: "extraBlock",
            propSchema: {},
          },
          {} as any,
        ),
      },
    });

    new ReactEmailExporter(
      schema,
      // @ts-expect-error
      reactEmailDefaultSchemaMappings,
    );

    new ReactEmailExporter(schema, {
      // @ts-expect-error
      blockMapping: reactEmailDefaultSchemaMappings.blockMapping,
      inlineContentMapping:
        reactEmailDefaultSchemaMappings.inlineContentMapping,
      styleMapping: reactEmailDefaultSchemaMappings.styleMapping,
    });

    new ReactEmailExporter(schema, {
      blockMapping: {
        ...reactEmailDefaultSchemaMappings.blockMapping,
        extraBlock: (_b, _t) => {
          throw new Error("extraBlock not implemented");
        },
      },
      inlineContentMapping:
        reactEmailDefaultSchemaMappings.inlineContentMapping,
      styleMapping: reactEmailDefaultSchemaMappings.styleMapping,
    });
  });

  it("typescript: schema with extra inline content", async () => {
    const schema = BlockNoteSchema.create({
      inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        extraInlineContent: createInlineContentSpec(
          {
            type: "extraInlineContent",
            content: "styled",
            propSchema: {},
          },
          {} as any,
        ),
      },
    });

    new ReactEmailExporter(
      schema,
      // @ts-expect-error
      reactEmailDefaultSchemaMappings,
    );

    new ReactEmailExporter(schema, {
      blockMapping: reactEmailDefaultSchemaMappings.blockMapping,
      // @ts-expect-error
      inlineContentMapping:
        reactEmailDefaultSchemaMappings.inlineContentMapping,
      styleMapping: reactEmailDefaultSchemaMappings.styleMapping,
    });

    // no error
    new ReactEmailExporter(schema, {
      blockMapping: reactEmailDefaultSchemaMappings.blockMapping,
      styleMapping: reactEmailDefaultSchemaMappings.styleMapping,
      inlineContentMapping: {
        ...reactEmailDefaultSchemaMappings.inlineContentMapping,
        extraInlineContent: () => {
          throw new Error("extraInlineContent not implemented");
        },
      },
    });
  });

  it("typescript: schema with extra style", async () => {
    const schema = BlockNoteSchema.create({
      styleSpecs: {
        ...defaultStyleSpecs,
        extraStyle: createStyleSpec(
          {
            type: "extraStyle",
            propSchema: "boolean",
          },
          {} as any,
        ),
      },
    });

    new ReactEmailExporter(
      schema,
      // @ts-expect-error
      reactEmailDefaultSchemaMappings,
    );

    new ReactEmailExporter(schema, {
      blockMapping: reactEmailDefaultSchemaMappings.blockMapping,
      inlineContentMapping:
        reactEmailDefaultSchemaMappings.inlineContentMapping,
      // @ts-expect-error
      styleMapping: reactEmailDefaultSchemaMappings.styleMapping,
    });

    // no error
    new ReactEmailExporter(schema, {
      blockMapping: reactEmailDefaultSchemaMappings.blockMapping,
      inlineContentMapping:
        reactEmailDefaultSchemaMappings.inlineContentMapping,
      styleMapping: {
        ...reactEmailDefaultSchemaMappings.styleMapping,
        extraStyle: () => {
          throw new Error("extraStyle not implemented");
        },
      },
    });
  });

  it("should export a document with preview", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
      }),
      reactEmailDefaultSchemaMappings,
    );

    const html = await exporter.toReactEmailDocument(testDocument as any, {
      preview: "This is a preview of the email content",
    });
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterWithPreview");
  });

  it("should export a document with multiple preview lines", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
      }),
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
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Simple text content",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
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
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Bold and italic text",
            styles: {
              bold: true,
              italic: true,
            },
          },
        ],
        children: [],
        props: {},
      },
    ];

    const html = await exporter.toReactEmailDocument(styledDocument as any);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterStyledText");
  });

  it("should handle document with links", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const linkDocument = [
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://example.com",
            content: [
              {
                type: "text",
                text: "Click here",
                styles: {},
              },
            ],
          },
        ],
        children: [],
        props: {},
      },
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
      {
        id: "1",
        type: "bulletListItem",
        content: [
          {
            type: "text",
            text: "Parent item",
            styles: {},
          },
        ],
        children: [
          {
            id: "2",
            type: "bulletListItem",
            content: [
              {
                type: "text",
                text: "Child item",
                styles: {},
              },
            ],
            children: [],
            props: {},
          },
        ],
        props: {},
      },
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
      {
        id: "1",
        type: "heading",
        content: [
          {
            type: "text",
            text: "Main Heading",
            styles: {},
          },
        ],
        children: [],
        props: { level: 1 },
      },
      {
        id: "2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Regular paragraph with ",
            styles: {},
          },
          {
            type: "text",
            text: "bold text",
            styles: { bold: true },
          },
        ],
        children: [],
        props: {},
      },
      {
        id: "3",
        type: "numberedListItem",
        content: [
          {
            type: "text",
            text: "Numbered list item",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
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
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Center aligned text",
            styles: {},
          },
        ],
        children: [],
        props: { textAlignment: "center" },
      },
      {
        id: "2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Right aligned text",
            styles: {},
          },
        ],
        children: [],
        props: { textAlignment: "right" },
      },
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
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text with background color",
            styles: {},
          },
        ],
        children: [],
        props: { backgroundColor: "blue" },
      },
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
      {
        id: "1",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Colored text",
            styles: {},
          },
        ],
        children: [],
        props: { textColor: "red" },
      },
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
      {
        id: "1",
        type: "checkListItem",
        content: [
          {
            type: "text",
            text: "Checked item",
            styles: {},
          },
        ],
        children: [],
        props: { checked: true },
      },
      {
        id: "2",
        type: "checkListItem",
        content: [
          {
            type: "text",
            text: "Unchecked item",
            styles: {},
          },
        ],
        children: [],
        props: { checked: false },
      },
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
      {
        id: "1",
        type: "heading",
        content: [
          {
            type: "text",
            text: "Heading 1",
            styles: {},
          },
        ],
        children: [],
        props: { level: 1 },
      },
      {
        id: "2",
        type: "heading",
        content: [
          {
            type: "text",
            text: "Heading 2",
            styles: {},
          },
        ],
        children: [],
        props: { level: 2 },
      },
      {
        id: "3",
        type: "heading",
        content: [
          {
            type: "text",
            text: "Heading 3",
            styles: {},
          },
        ],
        children: [],
        props: { level: 3 },
      },
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
      {
        id: "1",
        type: "heading",
        content: [
          {
            type: "text",
            text: "Complex Document",
            styles: { bold: true },
          },
        ],
        children: [],
        props: { level: 1 },
      },
      {
        id: "2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a paragraph with ",
            styles: {},
          },
          {
            type: "text",
            text: "bold",
            styles: { bold: true },
          },
          {
            type: "text",
            text: " and ",
            styles: {},
          },
          {
            type: "text",
            text: "italic",
            styles: { italic: true },
          },
          {
            type: "text",
            text: " text, plus a ",
            styles: {},
          },
          {
            type: "link",
            href: "https://example.com",
            content: [
              {
                type: "text",
                text: "link",
                styles: {},
              },
            ],
          },
          {
            type: "text",
            text: ".",
            styles: {},
          },
        ],
        children: [],
        props: { textAlignment: "center" },
      },
      {
        id: "3",
        type: "bulletListItem",
        content: [
          {
            type: "text",
            text: "List item with nested content",
            styles: {},
          },
        ],
        children: [
          {
            id: "4",
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Nested paragraph",
                styles: {},
              },
            ],
            children: [],
            props: {},
          },
          {
            id: "5",
            type: "numberedListItem",
            content: [
              {
                type: "text",
                text: "Nested numbered item",
                styles: {},
              },
            ],
            children: [],
            props: {},
          },
        ],
        props: {},
      },
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
      {
        id: "1",
        type: "bulletListItem",
        content: [
          {
            type: "text",
            text: "Bullet item 1",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
      {
        id: "2",
        type: "bulletListItem",
        content: [
          {
            type: "text",
            text: "Bullet item 2",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
      {
        id: "3",
        type: "numberedListItem",
        content: [
          {
            type: "text",
            text: "Numbered item 1",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
      {
        id: "4",
        type: "numberedListItem",
        content: [
          {
            type: "text",
            text: "Numbered item 2",
            styles: {},
          },
        ],
        children: [],
        props: {},
      },
    ];

    const html = await exporter.toReactEmailDocument(mixedListDocument as any);

    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporterMixedLists");
  });
});
