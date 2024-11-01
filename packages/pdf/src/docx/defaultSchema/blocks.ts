import {
  COLORS_DEFAULT,
  DefaultBlockSchema,
  DefaultProps,
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

function blockPropsToStyles(
  props: Partial<DefaultProps>,
  colors: typeof COLORS_DEFAULT
): IParagraphOptions {
  return {
    shading:
      props.backgroundColor === "default" || !props.backgroundColor
        ? undefined
        : {
            type: ShadingType.SOLID,
            color:
              colors[
                props.backgroundColor as keyof typeof colors
              ].background.slice(1),
          },
    run:
      props.textColor === "default" || !props.textColor
        ? undefined
        : {
            color: colors[props.textColor as keyof typeof colors].text.slice(1),
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
export const docxBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema,
  any,
  any,
  | Promise<Paragraph[] | Paragraph | DocxTable>
  | Paragraph[]
  | Paragraph
  | DocxTable,
  ParagraphChild
> = {
  paragraph: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: exporter.transformInlineContent(block.content),
      style: "Normal",
      run: {
        font: "Inter",
      },
    });
  },
  numberedListItem: (block, exporter, nestingLevel) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: exporter.transformInlineContent(block.content),
      numbering: {
        reference: "blocknote-numbered-list",
        level: nestingLevel,
      },
    });
  },
  bulletListItem: (block, exporter, nestingLevel) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: exporter.transformInlineContent(block.content),
      numbering: {
        reference: "blocknote-bullet-list",
        level: nestingLevel,
      },
    });
  },
  checkListItem: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: [
        new CheckBox({ checked: block.props.checked }),
        new TextRun({
          children: [" "],
        }),
        ...exporter.transformInlineContent(block.content),
      ],
    });
  },
  heading: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: exporter.transformInlineContent(block.content),
      heading: `Heading${block.props.level}`,
    });
  },
  audio: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  video: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  file: (block, exporter) => {
    return new Paragraph({
      ...blockPropsToStyles(block.props, exporter.options.colors),
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  codeBlock: (block, _exporter) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: block.type + " not implemented",
        }),
      ],
    });
  },
  image: async (block, exporter) => {
    const blob = await exporter.resolveFile(block.props.url);
    const { width, height } = await getImageDimensions(blob);

    return [
      new Paragraph({
        ...blockPropsToStyles(block.props, exporter.options.colors),
        children: [
          new ImageRun({
            data: await blob.arrayBuffer(),
            type: "gif", // TODO
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
        ...blockPropsToStyles(block.props, exporter.options.colors),
        children: [
          new TextRun({
            text: block.props.caption,
          }),
        ],
        style: "Caption", // TODO: add style?
      }),
    ];
  },
  table: (block, exporter) => {
    return Table(block.content, exporter);
  },
};
