import { BlockMapping, DefaultBlockSchema } from "@blocknote/core";
import { ODTExporter } from "../odtExporter.js";
import {
  DrawFrame,
  DrawImage,
  StyleBackgroundFill,
  StyleParagraphProperties,
  StyleStyle,
  Table,
  TableCell,
  TableRow,
  TextH,
  TextList,
  TextListItem,
  TextP,
  TextSpan,
  TextTab,
} from "../util/components.js";

export const getTabs = (nestingLevel: number) => {
  return Array.from({ length: nestingLevel }, () => <TextTab />);
};

const createParagraphStyle = (
  exporter: ODTExporter<any, any, any>,
  props: Record<string, any>
) => {
  const styles: Record<string, string> = {};
  const children: React.ReactNode[] = [];

  if (props.textAlignment !== "default") {
    styles["fo:text-align"] = props.textAlignment;
  }

  if (props.backgroundColor && props.backgroundColor !== "default") {
    const color =
      exporter.options.colors[
        props.backgroundColor as keyof typeof exporter.options.colors
      ].background;
    children.push(<StyleBackgroundFill color={color} />);
  }

  if (Object.keys(styles).length === 0 && children.length === 0) {
    return undefined;
  }

  return exporter.registerStyle((name) => (
    <StyleStyle style:family="paragraph" style:name={name}>
      <StyleParagraphProperties {...styles}>
        {children}
      </StyleParagraphProperties>
    </StyleStyle>
  ));
};

export const odtBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema,
  any,
  any,
  React.ReactNode,
  React.ReactNode
> = {
  paragraph: (block, exporter, nestingLevel) => {
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props
    );
    return (
      <TextP text:style-name={styleName}>
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </TextP>
    );
  },

  heading: (block, exporter, nestingLevel) => {
    const customStyleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props
    );
    const styleName = customStyleName;

    return (
      <TextH level={block.props.level} text:style-name={styleName}>
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </TextH>
    );
  },

  bulletListItem: (block, exporter) => (
    <TextList text:style-name="List_1">
      <TextListItem>
        <TextP>{exporter.transformInlineContent(block.content)}</TextP>
      </TextListItem>
    </TextList>
  ),

  numberedListItem: (block, exporter) => (
    <TextList text:style-name="Numbering_1">
      <TextListItem>
        <TextP>{exporter.transformInlineContent(block.content)}</TextP>
      </TextListItem>
    </TextList>
  ),

  checkListItem: (block, exporter) => (
    <TextP>
      <TextSpan>{block.props.checked ? "☒" : "☐"}</TextSpan>
      {exporter.transformInlineContent(block.content)}
    </TextP>
  ),

  image: async (block, exporter) => {
    await exporter.resolveFile(block.props.url);
    return (
      <DrawFrame>
        <DrawImage href={`Pictures/${block.props.url}`} />
      </DrawFrame>
    );
  },

  table: (block, exporter) => (
    <Table>
      {block.content.rows.map((row) => (
        <TableRow>
          {row.cells.map((cell) => (
            <TableCell>
              <TextP>{exporter.transformInlineContent(cell)}</TextP>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Table>
  ),

  codeBlock: (block, exporter) => (
    <TextP>
      <TextSpan style:style-name="Preformatted_20_Text">
        {exporter.transformInlineContent(block.content)}
      </TextSpan>
    </TextP>
  ),

  file: async (block, exporter) => {
    return <TextP>Not implemented</TextP>;
  },

  video: (block) => (
    <TextP>
      <TextSpan>[Video: {block.props.url}]</TextSpan>
    </TextP>
  ),

  audio: (block) => (
    <TextP>
      <TextSpan>[Audio: {block.props.url}]</TextSpan>
    </TextP>
  ),
};
