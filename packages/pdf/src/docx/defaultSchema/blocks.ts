import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import {
  CheckBox,
  Paragraph,
  ParagraphChild,
  TabStopType,
  TextRun,
} from "docx";
import { BlockMapping } from "../../mapping";

function createTabStops(nestingLevel: number): any[] {
  const tabStops: any[] = [];
  for (let i = 0; i < Math.min(nestingLevel, 5); i++) {
    // create min. 5 tabstops
    tabStops.push({
      position: 200 * (i + 1),
      type: TabStopType.LEFT,
    });
  }
  return tabStops;
}

export const docxBlockMappingForDefaultSchema = {
  paragraph: (block, inlineContentTransformer, nestingLevel) => {
    return new Paragraph({
      children: inlineContentTransformer(block.content),
      style: "Normal",
      tabStops: createTabStops(nestingLevel),
    });
  },
  numberedListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: inlineContentTransformer(block.content),
      numbering: {
        reference: "blocknote-numbering",
        level: 0,
      },
    });
  },
  bulletListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: inlineContentTransformer(block.content),
      bullet: {
        level: 0,
      },
    });
  },
  checkListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new CheckBox({ checked: block.props.checked }),
        ...inlineContentTransformer(block.content),
      ],
      bullet: {
        level: 0,
      },
    });
  },
  heading: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: inlineContentTransformer(block.content),
      heading: `Heading${block.props.level}`,
    });
  },
  audio: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  video: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  file: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  image: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  table: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  Paragraph,
  ParagraphChild[]
>;
