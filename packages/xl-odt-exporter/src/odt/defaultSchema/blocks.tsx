import {
  BlockMapping,
  DefaultBlockSchema,
  DefaultProps,
} from "@blocknote/core";
import { ODTExporter } from "../odtExporter.js";
import {
  DrawFrame,
  DrawImage,
  LoextGraphicProperties,
  StyleParagraphProperties,
  StyleStyle,
  StyleTableCellProperties,
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
  props: Partial<DefaultProps>,
  parentStyleName?: string
) => {
  const styles: Record<string, string> = {};
  const styleChildren: React.ReactNode[] = [];
  const paragraphChildren: React.ReactNode[] = [];

  if (props.textAlignment && props.textAlignment !== "left") {
    const alignmentMap = {
      left: "start",
      center: "center",
      right: "end",
      justify: "justify",
    };
    styles["fo:text-align"] =
      alignmentMap[props.textAlignment as keyof typeof alignmentMap];
  }

  if (props.backgroundColor && props.backgroundColor !== "default") {
    const color =
      exporter.options.colors[
        props.backgroundColor as keyof typeof exporter.options.colors
      ].background;
    styleChildren.push(
      <>
        <LoextGraphicProperties draw:fill="solid" draw:fill-color={color} />
        <StyleParagraphProperties fo:background-color={color} />
      </>
    );
  }

  if (props.textColor && props.textColor !== "default") {
    const color =
      exporter.options.colors[
        props.textColor as keyof typeof exporter.options.colors
      ].text;
    styles["fo:color"] = color;
  }

  if (
    Object.keys(styles).length === 0 &&
    styleChildren.length === 0
    // && paragraphChildren.length === 0
  ) {
    return parentStyleName;
  }

  return exporter.registerStyle((name) => (
    <StyleStyle
      style:family="paragraph"
      style:name={name}
      style:parent-style-name={parentStyleName}>
      {styleChildren}
      {paragraphChildren.length > 0 ||
        (Object.keys(styles).length > 0 && (
          <StyleParagraphProperties {...styles}>
            {paragraphChildren}
          </StyleParagraphProperties>
        ))}
    </StyleStyle>
  ));
};

const createTableStyle = (exporter: ODTExporter<any, any, any>) => {
  const cellName = exporter.registerStyle((name) => (
    <StyleStyle style:family="table-cell" style:name={name}>
      <StyleTableCellProperties
        fo:border="0.0069in solid #000000"
        style:writing-mode="lr-tb"
        fo:padding-top="0in"
        fo:padding-left="0.075in"
        fo:padding-bottom="0in"
        fo:padding-right="0.075in"
      />
    </StyleStyle>
  ));

  return cellName;
};

const wrapWithLists = (
  content: React.ReactNode,
  level: number
): React.ReactNode => {
  if (level <= 0) {
    return content;
  }
  return (
    <TextList>
      <TextListItem>{wrapWithLists(content, level - 1)}</TextListItem>
    </TextList>
  );
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
      block.props,
      "Heading_20_" + block.props.level
    );
    const styleName = customStyleName;

    return (
      <TextH level={block.props.level} text:style-name={styleName}>
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </TextH>
    );
  },

  /**
   * Note: we wrap each list item in it's own list element.
   * This is not the cleanest solution, it would be nicer to recognize subsequent
   * list items and wrap them in the same list element.
   *
   * However, Word DocX -> ODT export actually does the same thing, so
   * for now it seems reasonable.
   *
   * (LibreOffice does nicely wrap the list items in the same list element)
   */
  bulletListItem: (block, exporter, nestingLevel) => {
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props
    );
    return (
      <TextList text:style-name="WWNum1">
        <TextListItem>
          {wrapWithLists(
            <TextP text:style-name={styleName}>
              {exporter.transformInlineContent(block.content)}
            </TextP>,
            nestingLevel
          )}
        </TextListItem>
      </TextList>
    );
  },

  numberedListItem: (block, exporter, nestingLevel, numberedListIndex) => {
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props
    );
    // continue numbering from the previous list item if this is not the first item
    const continueNumbering = (numberedListIndex || 0) > 1 ? "true" : "false";
    return (
      <TextList
        text:style-name="No_20_List"
        text:continue-numbering={continueNumbering}>
        <TextListItem>
          {wrapWithLists(
            <TextP text:style-name={styleName}>
              {exporter.transformInlineContent(block.content)}
            </TextP>,
            nestingLevel
          )}
        </TextListItem>
      </TextList>
    );
  },

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

  table: (block, exporter) => {
    const ex = exporter as ODTExporter<any, any, any>;
    const styleName = createTableStyle(ex);

    return (
      <Table>
        {block.content.rows[0]?.cells.map((el, i) => {
          let width: any = block.content.columnWidths[i];

          if (!width) {
            // width = "3in";
          } else {
            width = "5in";
          }
          if (width) {
            const style = ex.registerStyle((name) => (
              <StyleStyle style:name={name} style:family="table-column">
                <style:table-column-properties style:column-width={width} />
              </StyleStyle>
            ));
            return <table:table-column table:style-name={style} />;
          } else {
            const style = ex.registerStyle((name) => (
              <StyleStyle style:name={name} style:family="table-column">
                <style:table-column-properties style:use-optimal-column-width="true" />
              </StyleStyle>
            ));
            return <table:table-column table:style-name={style} />;
          }
        })}
        {block.content.rows.map((row) => (
          <TableRow>
            {row.cells.map((cell) => (
              <TableCell table:style-name={styleName}>
                <TextP>{exporter.transformInlineContent(cell)}</TextP>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </Table>
    );
  },

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
