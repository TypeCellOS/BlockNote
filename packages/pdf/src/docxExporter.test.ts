import {
  AlignmentType,
  Document,
  LevelFormat,
  LineRuleType,
  Packer,
  UnderlineType,
} from "docx";
import fs from "fs";
import { describe, it } from "vitest";
import { createDocxExporterForDefaultSchema } from "./docxExporter";
import { testDocument } from "./testDocument";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = createDocxExporterForDefaultSchema();
    const ps = exporter.transform(testDocument);

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Inter, SF Pro Display, BlinkMacSystemFont, Open Sans, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
              size: "14pt",
            },
            paragraph: {
              spacing: {
                line: 288,
                lineRule: LineRuleType.AUTO,

                // before: 2808,
                // after: 2808,
              },
            },
            // next: "Normal",
            // quickFormat: true,
            // run: {
            //   italics: true,
            //   color: "999999",
            // },
            // paragraph: {
            //   spacing: {
            //     line: 276,
            //   },
            //   indent: {
            //     left: 720,
            //   },
            // },
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

    // const doc2 = new Document({
    //   sections: [
    //     {
    //       properties: {},
    //       children: [
    //         new Paragraph({
    //           children: [new TextRun("Hello World")],
    //         }),
    //         new Paragraph({
    //           children: [new TextRun("Heading")],
    //           heading: HeadingLevel.HEADING_1,
    //         }),
    //         new Paragraph({
    //           children: [new TextRun("Goodbye")],
    //         }),
    //       ],
    //     },
    //   ],
    // });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(__dirname + "/My Document.docx", buffer);

    // await saveTestFile();
  });
});
