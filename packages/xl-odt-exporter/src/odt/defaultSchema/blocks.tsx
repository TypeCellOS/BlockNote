import {
  BlockMapping,
  DefaultBlockSchema,
  DefaultProps,
  mapTableCell,
  pageBreakSchema,
  StyledText,
  TableCell,
} from "@blocknote/core";
import { ODTExporter } from "../odtExporter.js";

export const getTabs = (nestingLevel: number) => {
  return Array.from({ length: nestingLevel }, () => <text:tab />);
};

const createParagraphStyle = (
  exporter: ODTExporter<any, any, any>,
  props: Partial<DefaultProps>,
  parentStyleName = "Standard",
  styleAttributes: Record<string, string> = {},
  paragraphStyleAttributes: Record<string, string> = {},
  textStyleAttributes: Record<string, string> = {},
) => {
  const paragraphStyles: Record<string, string> = {
    ...paragraphStyleAttributes,
  };
  const textStyles: Record<string, string> = { ...textStyleAttributes };

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
    <style:style
      style:family="paragraph"
      style:name={name}
      style:parent-style-name={parentStyleName}
      {...styleAttributes}
    >
      {backgroundColor && (
        <loext:graphic-properties
          draw:fill="solid"
          draw:fill-color={backgroundColor}
        />
      )}
      {Object.keys(paragraphStyles).length > 0 && (
        <style:paragraph-properties {...paragraphStyles} />
      )}
      {Object.keys(textStyles).length > 0 && (
        <style:text-properties {...textStyles}></style:text-properties>
      )}
    </style:style>
  ));
};

const createTableCellStyle = (
  exporter: ODTExporter<any, any, any>,
): ((cell: TableCell<any, any>) => string) => {
  // To not create a new style for each cell within a table, we cache the styles based on unique cell properties
  const cellStyleCache = new Map<string, string>();

  return (cell: TableCell<any, any>) => {
    const key = `${cell.props.backgroundColor}-${cell.props.textColor}-${cell.props.textAlignment}`;

    if (cellStyleCache.has(key)) {
      return cellStyleCache.get(key)!;
    }

    const styleName = exporter.registerStyle((name) => (
      <style:style style:family="table-cell" style:name={name}>
        <style:table-cell-properties
          fo:border="0.5pt solid #000000"
          style:writing-mode="lr-tb"
          fo:padding-top="0in"
          fo:padding-left="0.075in"
          fo:padding-bottom="0in"
          fo:padding-right="0.075in"
          fo:background-color={
            cell.props.backgroundColor !== "default" &&
            cell.props.backgroundColor
              ? exporter.options.colors[
                  cell.props
                    .backgroundColor as keyof typeof exporter.options.colors
                ].background
              : undefined
          }
          // TODO This is not applying because the children set their own colors
          fo:color={
            cell.props.textColor !== "default" && cell.props.textColor
              ? exporter.options.colors[
                  cell.props.textColor as keyof typeof exporter.options.colors
                ].text
              : undefined
          }
        />
      </style:style>
    ));

    cellStyleCache.set(key, styleName);

    return styleName;
  };
};
const createTableStyle = (
  exporter: ODTExporter<any, any, any>,
  options: { width: number },
) => {
  const tableStyleName = exporter.registerStyle((name) => (
    <style:style style:family="table" style:name={name}>
      <style:table-properties
        table:align="left"
        style:writing-mode="lr-tb"
        style:width={`${options.width}pt`}
      />
    </style:style>
  ));

  return tableStyleName;
};

const wrapWithLists = (
  content: React.ReactNode,
  level: number,
): React.ReactNode => {
  if (level <= 0) {
    return content;
  }
  return (
    <text:list>
      <text:list-item>{wrapWithLists(content, level - 1)}</text:list-item>
    </text:list>
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
      block.props,
    );

    return (
      <text:p text:style-name={styleName}>
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </text:p>
    );
  },

  heading: (block, exporter, nestingLevel) => {
    const customStyleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props,
      "Heading_20_" + block.props.level,
    );
    const styleName = customStyleName;

    return (
      <text:h
        text:outline-level={`${block.props.level}`}
        text:style-name={styleName}
      >
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </text:h>
    );
  },

  quote: (block, exporter, nestingLevel) => {
    const customStyleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props,
      "Standard",
      {},
      {
        "fo:border-left": "2pt solid #7D797A",
        "fo:padding-left": "0.25in",
      },
      {
        "fo:color": "#7D797A",
      },
    );
    const styleName = customStyleName;

    return (
      <text:p text:style-name={styleName}>
        {getTabs(nestingLevel)}
        {exporter.transformInlineContent(block.content)}
      </text:p>
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
  toggleListItem: (block, exporter) => (
    <text:p text:style-name="Standard">
      {"> "}
      {exporter.transformInlineContent(block.content)}
    </text:p>
  ),

  bulletListItem: (block, exporter, nestingLevel) => {
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props,
      "Standard",
      { "style:list-style-name": "WWNum1" },
    );
    return (
      <text:list text:style-name="WWNum1">
        <text:list-item>
          {wrapWithLists(
            <text:p text:style-name={styleName}>
              {exporter.transformInlineContent(block.content)}
            </text:p>,
            nestingLevel,
          )}
        </text:list-item>
      </text:list>
    );
  },

  numberedListItem: (block, exporter, nestingLevel, numberedListIndex) => {
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props,
    );
    // continue numbering from the previous list item if this is not the first item
    const continueNumbering = (numberedListIndex || 0) > 1 ? "true" : "false";

    return (
      <text:list
        text:style-name="No_20_List"
        text:continue-numbering={continueNumbering}
      >
        <text:list-item
          {...(continueNumbering === "false" && {
            "text:start-value": block.props.start,
          })}
        >
          {wrapWithLists(
            <text:p text:style-name={styleName}>
              {exporter.transformInlineContent(block.content)}
            </text:p>,
            nestingLevel,
          )}
        </text:list-item>
      </text:list>
    );
  },

  checkListItem: (block, exporter) => (
    <text:p text:style-name="Standard">
      {block.props.checked ? "☒ " : "☐ "}
      {exporter.transformInlineContent(block.content)}
    </text:p>
  ),

  pageBreak: async () => {
    return <text:p text:style-name="PageBreak" />;
  },

  image: async (block, exporter) => {
    const odtExporter = exporter as ODTExporter<any, any, any>;

    const { path, mimeType, ...originalDimensions } =
      await odtExporter.registerPicture(block.props.url);
    const styleName = createParagraphStyle(
      exporter as ODTExporter<any, any, any>,
      block.props,
    );
    const width = block.props.previewWidth || originalDimensions.width;
    const height =
      (originalDimensions.height / originalDimensions.width) * width;
    const captionHeight = 20;
    const imageFrame = (
      <text:p text:style-name={block.props.caption ? "Caption" : styleName}>
        <draw:frame
          draw:style-name="Frame"
          style:rel-height="scale"
          svg:width={`${width}px`}
          svg:height={`${height}px`}
          style:rel-width={block.props.caption ? "100%" : `${width}px`}
          {...(!block.props.caption && {
            "text:anchor-type": "as-char",
          })}
        >
          <draw:image
            xlink:type="simple"
            xlink:show="embed"
            xlink:actuate="onLoad"
            xlink:href={path}
            draw:mime-type={mimeType}
          />
        </draw:frame>
        <text:line-break />
        <text:span text:style-name="Caption">{block.props.caption}</text:span>
      </text:p>
    );

    if (block.props.caption) {
      return (
        <text:p text:style-name={styleName}>
          <draw:frame
            draw:style-name="Frame"
            style:rel-height="scale"
            style:rel-width={`${width}px`}
            svg:width={`${width}px`}
            svg:height={`${height + captionHeight}px`}
            text:anchor-type="as-char"
          >
            <draw:text-box>{imageFrame}</draw:text-box>
          </draw:frame>
        </text:p>
      );
    }

    return imageFrame;
  },

  table: (block, exporter) => {
    const DEFAULT_COLUMN_WIDTH_PX = 120;
    const tableWidthPX =
      block.content.columnWidths.reduce(
        (totalWidth, colWidth) =>
          (totalWidth || 0) + (colWidth || DEFAULT_COLUMN_WIDTH_PX),
        0,
      ) || 0;
    const tableWidthPT = tableWidthPX * 0.75;
    const ex = exporter as ODTExporter<any, any, any>;
    const getCellStyleName = createTableCellStyle(ex);
    const tableStyleName = createTableStyle(ex, { width: tableWidthPT });

    return (
      <table:table table:name={block.id} table:style-name={tableStyleName}>
        {block.content.rows[0]?.cells.map((_, i) => {
          const colWidthPX =
            block.content.columnWidths[i] || DEFAULT_COLUMN_WIDTH_PX;
          const colWidthPT = colWidthPX * 0.75;
          const style = ex.registerStyle((name) => (
            <style:style style:name={name} style:family="table-column">
              <style:table-column-properties
                style:column-width={`${colWidthPT}pt`}
              />
            </style:style>
          ));
          return <table:table-column table:style-name={style} key={i} />;
        })}
        {block.content.rows.map((row, rowIndex) => (
          <table:table-row key={rowIndex}>
            {row.cells.map((c, colIndex) => {
              const cell = mapTableCell(c);
              return (
                <table:table-cell
                  key={`${rowIndex}-${colIndex}`}
                  table:style-name={getCellStyleName(cell)}
                  office:value-type="string"
                  style:text-align-source="fix"
                  style:paragraph-properties-text-align={
                    cell.props.textAlignment
                  }
                >
                  <text:p text:style-name="Standard">
                    {exporter.transformInlineContent(cell.content)}
                  </text:p>
                </table:table-cell>
              );
            })}
          </table:table-row>
        ))}
      </table:table>
    );
  },

  codeBlock: (block) => {
    const textContent = (block.content as StyledText<any>[])[0]?.text || "";

    return (
      <text:p text:style-name="Codeblock">
        {...textContent.split("\n").map((line, index) => {
          return (
            <>
              {index !== 0 && <text:line-break />}
              {line}
            </>
          );
        })}
      </text:p>
    );
  },

  file: async (block) => {
    return (
      <>
        <text:p style:style-name="Standard">
          {block.props.url ? (
            <text:a
              xlink:type="simple"
              text:style-name="Internet_20_link"
              office:target-frame-name="_top"
              xlink:show="replace"
              xlink:href={block.props.url}
            >
              <text:span text:style-name="Internet_20_link">
                Open file
              </text:span>
            </text:a>
          ) : (
            "Open file"
          )}
        </text:p>
        {block.props.caption && (
          <text:p text:style-name="Caption">{block.props.caption}</text:p>
        )}
      </>
    );
  },

  video: (block) => (
    <>
      <text:p style:style-name="Standard">
        <text:a
          xlink:type="simple"
          text:style-name="Internet_20_link"
          office:target-frame-name="_top"
          xlink:show="replace"
          xlink:href={block.props.url}
        >
          <text:span text:style-name="Internet_20_link">Open video</text:span>
        </text:a>
      </text:p>
      {block.props.caption && (
        <text:p text:style-name="Caption">{block.props.caption}</text:p>
      )}
    </>
  ),

  audio: (block) => (
    <>
      <text:p style:style-name="Standard">
        <text:a
          xlink:type="simple"
          text:style-name="Internet_20_link"
          office:target-frame-name="_top"
          xlink:show="replace"
          xlink:href={block.props.url}
        >
          <text:span text:style-name="Internet_20_link">Open audio</text:span>
        </text:a>
      </text:p>
      {block.props.caption && (
        <text:p text:style-name="Caption">{block.props.caption}</text:p>
      )}
    </>
  ),
};
