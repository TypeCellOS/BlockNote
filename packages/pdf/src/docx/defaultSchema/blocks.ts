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
  ImageRun,
  Paragraph,
  ParagraphChild,
  ShadingType,
  TextRun,
} from "docx";
import { BlockMapping } from "../../mapping.js";
import { getImageDimensions } from "../../util/imageUtil.js";
import { Table } from "../util/Table.js";

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
  paragraph: (block, inlineContentTransformer) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      style: "Normal",
      run: {
        font: "Inter",
      },
    });
  },
  numberedListItem: (block, inlineContentTransformer, nestingLevel) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      numbering: {
        reference: "blocknote-numbered-list",
        level: nestingLevel,
      },
    });
  },
  bulletListItem: (block, inlineContentTransformer, nestingLevel) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props),
      children: inlineContentTransformer(block.content),
      numbering: {
        reference: "blocknote-bullet-list",
        level: nestingLevel,
      },
    });
  },
  checkListItem: (block, inlineContentTransformer) => {
    return new Paragraph({
      children: [
        new CheckBox({ checked: block.props.checked }),
        new TextRun({
          children: [" "],
        }),
        ...inlineContentTransformer(block.content),
      ],
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
  image: async (block, _inlineContentTransformer) => {
    const blob = await (await fetch(block.props.url)).blob();
    const { width, height } = await getImageDimensions(blob);

    return [
      new Paragraph({
        ...blockPropsToStyles(block.props),
        children: [
          new ImageRun({
            data: await blob.arrayBuffer(),

            altText: block.props.caption
              ? {
                  description: block.props.caption,
                  name: block.props.caption,
                  title: block.props.caption,
                }
              : undefined,
            transformation: {
              width: block.props.previewWidth,
              height: (block.props.previewWidth / width) * height,
            },
          }),
        ],
      }),
      new Paragraph({
        ...blockPropsToStyles(block.props),
        children: [
          new TextRun({
            text: block.props.caption,
          }),
        ],
        style: "Caption",
      }),
    ];
  },
  table: (block, inlineContentTransformer) => {
    return Table(block.content.rows, inlineContentTransformer);
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  | Promise<Paragraph[] | Paragraph | DocxTable>
  | Paragraph[]
  | Paragraph
  | DocxTable,
  (
    inlineContent: InlineContent<InlineContentSchema, StyleSchema>[]
  ) => ParagraphChild[]
>;
