import {
  BlockMapping,
  COLORS_DEFAULT,
  DefaultBlockSchema,
  DefaultProps,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  CheckBox,
  Table as DocxTable,
  ExternalHyperlink,
  IParagraphOptions,
  ImageRun,
  Paragraph,
  ParagraphChild,
  ShadingType,
  TextRun,
} from "docx";
import { getImageDimensions } from "../imageUtil.js";
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
    return [
      file(block.props, "Open audio", exporter),
      ...caption(block.props, exporter),
    ];
  },
  video: (block, exporter) => {
    return [
      file(block.props, "Open video", exporter),
      ...caption(block.props, exporter),
    ];
  },
  file: (block, exporter) => {
    return [
      file(block.props, "Open file", exporter),
      ...caption(block.props, exporter),
    ];
  },
  // TODO
  codeBlock: (block, exporter) => {
    return new Paragraph({
      // ...blockPropsToStyles(block.props, exporter.options.colors),
      style: "Codeblock",
      children: exporter.transformInlineContent(block.content),
      // children: [
      //   new TextRun({
      //     text: block..type + " not implemented",
      //   }),
      // ],
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
            // it would be nicer to set the actual data type here, but then we'd need to use a mime type / image type
            // detector. atm passing gif does not seem to be causing issues as the "type" is mainly used by docxjs internally
            // (i.e.: to make sure it's not svg)
            type: "gif",
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
      ...caption(block.props, exporter),
    ];
  },
  table: (block, exporter) => {
    return Table(block.content, exporter);
  },
};

function file(
  props: Partial<DefaultProps & { name: string; url: string }>,
  defaultText: string,
  exporter: any
) {
  return new Paragraph({
    ...blockPropsToStyles(props, exporter.options.colors),
    children: [
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: props.name || defaultText,
            style: "Hyperlink",
          }),
        ],
        link: props.url!,
      }),
    ],
  });
}

function caption(
  props: Partial<DefaultProps & { caption: string }>,
  exporter: any
) {
  if (!props.caption) {
    return [];
  }
  return [
    new Paragraph({
      ...blockPropsToStyles(props, exporter.options.colors),
      children: [
        new TextRun({
          text: props.caption,
        }),
      ],
      style: "Caption",
    }),
  ];
}
