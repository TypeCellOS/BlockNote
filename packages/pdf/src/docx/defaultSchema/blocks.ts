import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultProps,
  DefaultStyleSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  CheckBox,
  Table as DocxTable,
  IParagraphOptions,
  Paragraph,
  ParagraphChild,
  ShadingType,
  TabStopType,
  TextRun,
} from "docx";
import { BlockMapping } from "../../mapping.js";
import { Table } from "../util/Table.js";

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

function blockPropsToStyles(props: Partial<DefaultProps>): IParagraphOptions {
  return {
    shading:
      props.backgroundColor === "default"
        ? undefined
        : {
            type: ShadingType.SOLID,
            color: "00ff00", // TODO
          },
    run:
      props.textColor === "default"
        ? undefined
        : {
            color: "ff0000", // TODO
          },
    alignment:
      !props.textAlignment || props.textAlignment === "left"
        ? undefined
        : props.textAlignment === "center"
        ? "center"
        : props.textAlignment === "right"
        ? "right"
        : props.textAlignment === "justify"
        ? "distribute"
        : (() => {
            throw new UnreachableCaseError(props.textAlignment);
          })(),
  };
}
export const docxBlockMappingForDefaultSchema = {
  paragraph: (block, inlineContentTransformer, nestingLevel) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      style: "Normal",
      run: {
        font: "Inter",
      },
      tabStops: createTabStops(nestingLevel),
    });
  },
  numberedListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      numbering: {
        reference: "blocknote-numbering",
        level: 0,
      },
    });
  },
  bulletListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
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
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      heading: `Heading${block.props.level}`,
    });
  },
  audio: (block, _inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  video: (block, _inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  file: (block, _inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  image: (block, _inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  table: (block, inlineContentTransformer) => {
    return Table(block.content.rows, inlineContentTransformer);
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  Paragraph | DocxTable,
  (
    inlineContent: InlineContent<InlineContentSchema, StyleSchema>[]
  ) => ParagraphChild[]
>;
