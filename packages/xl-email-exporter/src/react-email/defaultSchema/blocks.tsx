import {
  DefaultBlockSchema,
  mapTableCell,
  pageBreakSchema,
  StyledText,
} from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import {
  CodeBlock,
  dracula,
  Heading,
  Img,
  Link,
  PrismLanguage,
  Text,
} from "@react-email/components";

export const reactEmailBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema & typeof pageBreakSchema.blockSchema,
  any,
  any,
  React.ReactElement<any>,
  React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>
> = {
  paragraph: (block, t) => {
    return <Text>{t.transformInlineContent(block.content)}</Text>;
  },
  bulletListItem: (block, t) => {
    // Return only the <li> for grouping in the exporter
    return <Text>{t.transformInlineContent(block.content)}</Text>;
  },
  toggleListItem: (block, t) => {
    // Return only the <li> for grouping in the exporter
    return <Text>{t.transformInlineContent(block.content)}</Text>;
  },
  numberedListItem: (block, t, _nestingLevel) => {
    // Return only the <li> for grouping in the exporter
    return <Text>{t.transformInlineContent(block.content)}</Text>;
  },
  checkListItem: (block, t) => {
    // Render a checkbox using inline SVG for better appearance in email
    // block.props.checked should be true/false
    const checked = block.props?.checked;
    const checkboxSvg = checked ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
      >
        <rect
          x="2"
          y="2"
          width="14"
          height="14"
          rx="3"
          fill="#4F8A10"
          stroke="#4F8A10"
          strokeWidth="2"
        />
        <polyline
          points="5,10 8,13 13,6"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
      >
        <rect
          x="2"
          y="2"
          width="14"
          height="14"
          rx="3"
          fill="#fff"
          stroke="#888"
          strokeWidth="2"
        />
      </svg>
    );
    return (
      <Text>
        {checkboxSvg}
        <span>{t.transformInlineContent(block.content)}</span>
      </Text>
    );
  },
  heading: (block, t) => {
    return (
      <Heading as={`h${block.props.level}`}>
        {t.transformInlineContent(block.content)}
      </Heading>
    );
  },

  codeBlock: (block) => {
    const textContent = (block.content as StyledText<any>[])[0]?.text || "";

    return (
      <CodeBlock
        code={textContent}
        fontFamily="'CommitMono', monospace"
        language={block.props.language as PrismLanguage}
        theme={dracula}
      />
    );
  },
  audio: (block) => {
    // Audio icon SVG
    const icon = (
      <svg
        height="18"
        width="18"
        viewBox="0 0 24 24"
        fill="#4F8A10"
        style={{ display: "inline", verticalAlign: "middle" }}
      >
        <path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z" />
      </svg>
    );
    const previewWidth =
      "previewWidth" in block.props
        ? (block.props as any).previewWidth
        : undefined;
    return (
      <div style={{ margin: "8px 0" }}>
        <FileLink
          url={block.props.url}
          name={block.props.name}
          defaultText="Open audio file"
          icon={icon}
        />
        <Caption caption={block.props.caption} width={previewWidth} />
      </div>
    );
  },
  video: (block) => {
    // Video icon SVG
    const icon = (
      <svg
        height="18"
        width="18"
        viewBox="0 0 24 24"
        fill="#1976D2"
        style={{ display: "inline", verticalAlign: "middle" }}
      >
        <path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z" />
      </svg>
    );
    const previewWidth =
      "previewWidth" in block.props
        ? (block.props as any).previewWidth
        : undefined;
    return (
      <div style={{ margin: "8px 0" }}>
        <FileLink
          url={block.props.url}
          name={block.props.name}
          defaultText="Open video file"
          icon={icon}
        />
        <Caption caption={block.props.caption} width={previewWidth} />
      </div>
    );
  },
  file: (block) => {
    // File icon SVG
    const icon = (
      <svg
        height="18"
        width="18"
        viewBox="0 0 24 24"
        fill="#888"
        style={{ display: "inline", verticalAlign: "middle" }}
      >
        <path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z" />
      </svg>
    );
    const previewWidth =
      "previewWidth" in block.props
        ? (block.props as any).previewWidth
        : undefined;
    return (
      <div style={{ margin: "8px 0" }}>
        <FileLink
          url={block.props.url}
          name={block.props.name}
          defaultText="Open file"
          icon={icon}
        />
        <Caption caption={block.props.caption} width={previewWidth} />
      </div>
    );
  },
  image: (block) => {
    return (
      <Img
        src={block.props.url}
        width={block.props.previewWidth}
        alt={block.props.caption}
      />
    );
  },
  table: (block, t) => {
    // Render table using standard HTML table elements for email compatibility
    const table = block.content;
    if (!table || typeof table !== "object" || !Array.isArray(table.rows)) {
      return <Text>Table data not available</Text>;
    }
    const headerRowsCount = (table.headerRows as number) ?? 0;
    const headerColsCount = (table.headerCols as number) ?? 0;

    return (
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          margin: "16px 0",
          border: "1px solid #ddd",
          borderRadius: 4,
          overflow: "hidden",
        }}
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          {table.rows.map((row: any, rowIndex: number) => (
            <tr key={"row-" + rowIndex}>
              {row.cells.map((cell: any, colIndex: number) => {
                // Use mapTableCell to normalize table cell data into a standard interface
                // This handles partial cells, provides default values, and ensures consistent structure
                const normalizedCell = mapTableCell(cell);
                const isHeaderRow = rowIndex < headerRowsCount;
                const isHeaderCol = colIndex < headerColsCount;
                const isHeader = isHeaderRow || isHeaderCol;
                const CellTag = isHeader ? "th" : "td";
                return (
                  <CellTag
                    key={"row_" + rowIndex + "_col_" + colIndex}
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px 12px",
                      background: isHeader
                        ? "#f5f5f5"
                        : normalizedCell.props.backgroundColor !== "default"
                          ? normalizedCell.props.backgroundColor
                          : "#fff",
                      fontWeight: isHeader ? "bold" : "normal",
                      textAlign: normalizedCell.props.textAlignment || "left",
                      color:
                        normalizedCell.props.textColor !== "default"
                          ? normalizedCell.props.textColor
                          : "inherit",
                    }}
                    {...((normalizedCell.props.colspan || 1) > 1 && {
                      colSpan: normalizedCell.props.colspan || 1,
                    })}
                    {...((normalizedCell.props.rowspan || 1) > 1 && {
                      rowSpan: normalizedCell.props.rowspan || 1,
                    })}
                  >
                    {t.transformInlineContent(normalizedCell.content)}
                  </CellTag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  quote: (block, t) => {
    // Render block quote with a left border and subtle background for email compatibility
    return (
      <Text
        style={{
          borderLeft: "4px solid #bdbdbd",
          background: "#f9f9f9",
          padding: "12px 16px",
          margin: "16px 0",
          fontStyle: "italic",
          color: "#555",
          display: "block",
        }}
      >
        {t.transformInlineContent(block.content)}
      </Text>
    );
  },
  pageBreak: () => {
    // In email, a page break can be represented as a horizontal rule
    return (
      <hr
        style={{
          border: "none",
          borderTop: "2px dashed #ccc",
          margin: "24px 0",
        }}
      />
    );
  },
};

// Helper for file-like blocks (audio, video, file)
function FileLink({
  url,
  name,
  defaultText,
  icon,
}: {
  url?: string;
  name?: string;
  defaultText: string;
  icon: React.ReactElement;
}) {
  return (
    <Link
      href={url}
      style={{
        textDecoration: "none",
        color: "#333",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 16,
      }}
    >
      {icon}
      <span style={{ verticalAlign: "middle" }}>{name || defaultText}</span>
    </Link>
  );
}

function Caption({ caption, width }: { caption?: string; width?: number }) {
  if (!caption) {
    return null;
  }
  return (
    <Text style={{ width, fontSize: 13, color: "#888", margin: "4px 0 0 0" }}>
      {caption}
    </Text>
  );
}
