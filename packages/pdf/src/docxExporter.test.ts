import {
  BlockNoteSchema,
  partialBlocksToBlocksForTesting,
} from "@blocknote/core";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";
import fs from "fs";
import { describe, it } from "vitest";
import { createDocxExporterForDefaultSchema } from "./docxExporter";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = createDocxExporterForDefaultSchema();
    const ps = exporter.transform(
      partialBlocksToBlocksForTesting(BlockNoteSchema.create().blockSchema, [
        {
          type: "paragraph",
          content: "Welcome to this demo!",
          children: [
            {
              type: "paragraph",
              content: "Hello World",
            },
          ],
        },

        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Blocks:",
              styles: { bold: true },
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        {
          type: "heading",
          content: "Heading",
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        // {
        //   type: "bulletListItem",
        //   content: "Bullet List Item",
        // },
        // {
        //   type: "numberedListItem",
        //   content: "Numbered List Item",
        // },
        // {
        //   type: "checkListItem",
        //   content: "Check List Item",
        // },
        // {
        //   type: "table",
        //   content: {
        //     type: "tableContent",
        //     rows: [
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //     ],
        //   },
        // },
        // {
        //   type: "file",
        // },
        // {
        //   type: "image",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //   },
        // },
        // {
        //   type: "video",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //   },
        // },
        // {
        //   type: "audio",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //   },
        // },
        // {
        //   type: "paragraph",
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Inline Content:",
        //       styles: { bold: true },
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Styled Text",
        //       styles: {
        //         bold: true,
        //         italic: true,
        //         textColor: "red",
        //         backgroundColor: "blue",
        //       },
        //     },
        //     {
        //       type: "text",
        //       text: " ",
        //       styles: {},
        //     },
        //     {
        //       type: "link",
        //       content: "Link",
        //       href: "https://www.blocknotejs.org",
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        // },
      ])
    );
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "myWonkyStyle",
            name: "My Wonky Style",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              italics: true,
              color: "999999",
            },
            paragraph: {
              spacing: {
                line: 276,
              },
              indent: {
                left: 720,
              },
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 26,
              bold: true,
              color: "999999",
              underline: {
                type: UnderlineType.DOUBLE,
                color: "FF0000",
              },
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 26,
              bold: true,
              color: "999999",
              underline: {
                type: UnderlineType.DOUBLE,
                color: "FF0000",
              },
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "blocknote-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: ps,
        },
      ],
    });
    // console.log(JSON.stringify(ps, null, 2));

    const doc2 = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun("Hello World")],
            }),
            new Paragraph({
              children: [new TextRun("Heading")],
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun("Goodbye")],
            }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(__dirname + "/My Document.docx", buffer);

    // await saveTestFile();
  });
});
