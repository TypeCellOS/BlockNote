import {
  BlockNoteSchema,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Document, Packer, Paragraph, TextRun } from "docx";
import * as fs from "fs";

type Visitor<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
  R
> = {
  blocks: {
    [K in keyof BSchema]: (block: BSchema[K]) => R;
  };
  inlineContent: {
    [K in keyof ISchema]: (inlineContent: ISchema[K]) => R;
  };
  styles: {
    [K in keyof SSchema]: (style: SSchema[K]) => R;
  };
};

function createVisitor<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BlockNoteSchema<B, I, S>,
  visitor: Visitor<NoInfer<B>, NoInfer<I>, NoInfer<S>, any>
) {
  return visitor;
}

const defaultDocXVisitor = createVisitor(BlockNoteSchema.create(), {
  blocks: {},
});

// Documents contain sections, you can have multiple sections per document, go here to learn more about sections
// This simple example will only contain one section
const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun("Hello World"),
            new TextRun({
              text: "Foo Bar",
              bold: true,
            }),
            new TextRun({
              text: "\tGithub is the best",
              bold: true,
            }),
          ],
        }),
      ],
    },
  ],
});

// Used to export the file into a .docx file
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("My Document.docx", buffer);
});
