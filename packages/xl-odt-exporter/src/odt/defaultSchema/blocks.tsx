import {
  BlockMapping,
  DefaultBlockSchema,
  DefaultProps,
  pageBreakSchema,
  StyledText,
} from "@blocknote/core";
import { ODTExporter } from "../odtExporter.js";
import {
  DrawFrame,
  DrawImage,
  DrawTextBox,
  LoextGraphicProperties,
  StyleParagraphProperties,
  StyleStyle,
  StyleTableCellProperties,
  StyleTextProperties,
  Table,
  TableCell,
  TableColumn,
  TableRow,
  TextA,
  TextH,
  TextLineBreak,
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
  parentStyleName = "Standard",
  styleAttributes: Record<string, string> = {}
) => {
  const paragraphStyles: Record<string, string> = {};
  const textStyles: Record<string, string> = {};

  if (props.textAlignment && props.textAlignment !== "left") {
    const alignmentMap = {
      left: "start",
      center: "center",
      right: "end",
      justify: "justify",
    };
    paragraphStyles["fo:text-align"] =
      alignmentMap[props.textAlignment as keyof typeof alignmentMap];
  }

  const backgroundColor =
    props.backgroundColor && props.backgroundColor !== "default"
      ? exporter.options.colors[
          props.backgroundColor as keyof typeof exporter.options.colors
        ].background
      : undefined;

  if (backgroundColor) {
    paragraphStyles["fo:background-color"] = backgroundColor;
  }

  if (props.textColor && props.textColor !== "default") {
    const color =
      exporter.options.colors[
        props.textColor as keyof typeof exporter.options.colors
      ].text;
    textStyles["fo:color"] = color;
  }

  if (
    !backgroundColor &&
    !Object.keys(styleAttributes).length &&
    !Object.keys(paragraphStyles).length &&
    !Object.keys(textStyles).length
  ) {
    return parentStyleName || "Standard";
  }

  return exporter.registerStyle((name) => (
    <StyleStyle
      style:family="paragraph"
      style:name={name}
      style:parent-style-name={parentStyleName}
      {...styleAttributes}>
      {backgroundColor && (
        <LoextGraphicProperties
          draw:fill="solid"
          draw:fill-color={backgroundColor}
        />
      )}
      {Object.keys(paragraphStyles).length > 0 && (
        <StyleParagraphProperties {...paragraphStyles} />
      )}
      {Object.keys(textStyles).length > 0 && (
        <StyleTextProperties {...textStyles}></StyleTextProperties>
      )}
    </StyleStyle>
  ));
};

const createTableStyle = (exporter: ODTExporter<any, any, any>) => {
  const cellName = exporter.registerStyle((name) => (
    <StyleStyle style:family="table-cell" style:name={name}>
      <StyleTableCellProperties
        fo:border="0.5pt solid #000000"
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
  DefaultBlockSchema & typeof pageBreakSchema.blockSchema,
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
      block.props,
      "Standard",
      { "style:list-style-name": "WWNum1" }
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
        <TextListItem
          {...(continueNumbering === "false" && {
            "text:start-value": block.props.start,
          })}>
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
    <TextP text:style-name="Standard">
      {block.props.checked ? "☒ " : "☐ "}
      {exporter.transformInlineContent(block.content)}
    </TextP>
  ),

  pageBreak: async () => {
    return <TextP text:style-name="PageBreak" />;
  },

  image: async (block, exporter) => {
    const odtExporter = exporter as ODTExporter<any, any, any>;

    const { path, mimeType, ...originalDimensions } =
      await odtExporter.registerPicture(block.props.url);
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props
    );
    const width = block.props.previewWidth;
    const height =
      (originalDimensions.height / originalDimensions.width) * width;
    const captionHeight = 20;
    const imageFrame = (
      <TextP text:style-name={block.props.caption ? "Caption" : styleName}>
        <DrawFrame
          draw:style-name="Frame"
          style:rel-height="scale"
          svg:width={`${width}px`}
          svg:height={`${height}px`}
          style:rel-width={block.props.caption ? "100%" : `${width}px`}
          {...(!block.props.caption && {
            "text:anchor-type": "as-char",
          })}>
          <DrawImage
            xlink:type="simple"
            xlink:show="embed"
            xlink:actuate="onLoad"
            xlink:href={path}
            draw:mime-type={mimeType}
          />
        </DrawFrame>
        <TextLineBreak />
        <TextSpan text:style-name="Caption">{block.props.caption}</TextSpan>
      </TextP>
    );

    if (block.props.caption) {
      return (
        <TextP text:style-name={styleName}>
          <DrawFrame
            draw:style-name="Frame"
            style:rel-height="scale"
            style:rel-width={`${width}px`}
            svg:width={`${width}px`}
            svg:height={`${height + captionHeight}px`}
            text:anchor-type="as-char">
            <DrawTextBox>{imageFrame}</DrawTextBox>
          </DrawFrame>
        </TextP>
      );
    }

    return imageFrame;
  },

  table: (block, exporter) => {
    const ex = exporter as ODTExporter<any, any, any>;
    const styleName = createTableStyle(ex);

    return (
      <Table table:name={block.id}>
        {block.content.rows[0]?.cells.map((_, i) => {
          const colWidth = block.content.columnWidths[i];

          if (colWidth) {
            const style = ex.registerStyle((name) => (
              <StyleStyle style:name={name} style:family="table-column">
                <style:table-column-properties
                  style:column-width={`${colWidth}`}
                />
              </StyleStyle>
            ));
            return <TableColumn table:style-name={style} />;
          } else {
            const style = ex.registerStyle((name) => (
              <StyleStyle style:name={name} style:family="table-column">
                <style:table-column-properties style:use-optimal-column-width="true" />
              </StyleStyle>
            ));
            return <TableColumn table:style-name={style} />;
          }
        })}
        {block.content.rows.map((row) => (
          <TableRow>
            {row.cells.map((cell) => (
              <TableCell
                table:style-name={styleName}
                office:value-type="string">
                <TextP text:style-name="Standard">
                  {exporter.transformInlineContent(cell)}
                </TextP>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </Table>
    );
  },

  codeBlock: (block) => {
    const textContent = (block.content as StyledText<any>[])[0]?.text || "";

    return (
      <TextP text:style-name="Codeblock">
        {...textContent.split("\n").map((line, index) => {
          return (
            <>
              {index !== 0 && <TextLineBreak />}
              {line}
            </>
          );
        })}
      </TextP>
    );
  },

  file: async (block) => {
    return (
      <>
        <TextP style:style-name="Standard">
          {block.props.url ? (
            <TextA href={block.props.url}>Open file</TextA>
          ) : (
            "Open file"
          )}
        </TextP>
        {block.props.caption && (
          <TextP text:style-name="Caption">{block.props.caption}</TextP>
        )}
      </>
    );
  },

  video: (block) => (
    <>
      <TextP style:style-name="Standard">
        <TextA href={block.props.url}>Open video</TextA>
      </TextP>
      {block.props.caption && (
        <TextP text:style-name="Caption">{block.props.caption}</TextP>
      )}
    </>
  ),

  audio: (block) => (
    <>
      <TextP style:style-name="Standard">
        <TextA href={block.props.url}>Open audio</TextA>
      </TextP>
      {block.props.caption && (
        <TextP text:style-name="Caption">{block.props.caption}</TextP>
      )}
    </>
  ),
};
