import { DefaultBlockSchema, StyledText } from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import { CodeBlock, dracula, Heading, Img, Link, Text,} from "@react-email/components";
import { Section, Row, Column } from "@react-email/components";
import { pageBreakSchema } from "@blocknote/core";

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
        // Use <ul> and <li> with Tailwind classes via className (supported by react-email)
        return (
            <ul className="list-disc pl-6 mb-2">
                <li className="mb-1">
                    <Text>{t.transformInlineContent(block.content)}</Text>
                </li>
            </ul>
        );
    },
    numberedListItem: (block, t, _nestingLevel, numberedListIndex) => {
        // Use <ol> and <li> with Tailwind classes via className (supported by react-email)
        return (
            <ol className="list-decimal pl-6 mb-2" start={numberedListIndex}>
                <li className="mb-1" >
                    <Text>{t.transformInlineContent(block.content)}</Text>
                </li>
            </ol>
        );
    },
    // TODO
    checkListItem: (block, t) => {
        // Render a checkbox using inline SVG for better appearance in email
        // block.props.checked should be true/false
        const checked = block.props?.checked;
        const checkboxSvg = checked ? (
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}>
                <rect x="2" y="2" width="14" height="14" rx="3" fill="#4F8A10" stroke="#4F8A10" strokeWidth="2" />
                <polyline points="5,10 8,13 13,6" fill="none" stroke="#fff" strokeWidth="2" />
            </svg>
        ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}>
                <rect x="2" y="2" width="14" height="14" rx="3" fill="#fff" stroke="#888" strokeWidth="2" />
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
        
        return <CodeBlock
            code={textContent}
            fontFamily="'CommitMono', monospace"
            language="javascript"
            theme={dracula}
        />
        
    },
    audio: () => {
        return <></>; // Audio blocks are not typically rendered in email
    },
    video: () => {
        return <></>; // Video blocks are not typically rendered in email
    },
    file: () => {
        return <></>; // File blocks are not typically rendered in email
    },
    image: (block) => {
        return (
            <Img
                src={block.props.url}
                width={block.props.previewWidth}
                alt={block.props.caption} />
        );
    },
    table: (block, t) => {          
        
        // Render table using react-email Section, Row, and Column components
        // See: https://react.email/docs/components/section
        const table = block.content;
        if (!table || typeof table !== 'object' || !Array.isArray(table.rows)) {
            return <Text>Table data not available</Text>;
        }
        const headerRows = new Array((table.headerRows as number) ?? 0).fill(true);
        const headerCols = new Array((table.headerCols as number) ?? 0).fill(true);
        const columnWidths = (table.columnWidths as number[] | undefined) || [];
        // Calculate number of columns from the first row
        const numCols = table.rows[0]?.cells?.length || 1;
        // If no explicit columnWidths, use equal percentage widths
        const defaultColWidth = `${(100 / numCols).toFixed(2)}%`;
        
        return (
            <Section style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', margin: '16px 0' }}>
                {table.rows.map((row: any, rowIndex: any) => (
                    <Row key={'row-' + rowIndex}>
                        {row.cells.map((cell: any, colIndex: any) => {
                            const isHeaderRow = headerRows[rowIndex];
                            const isHeaderCol = headerCols[colIndex];
                            const isHeader = isHeaderRow || isHeaderCol;
                            // Use explicit width if provided, else fallback to equal width
                            const width = columnWidths[colIndex] ? columnWidths[colIndex] : defaultColWidth;
                            return (
                                <Column
                                    key={'row_' + rowIndex + '_col_' + colIndex}
                                    style={{
                                        borderBottom: rowIndex === table.rows.length - 1 ? 'none' : '1px solid #ddd',
                                        borderRight: colIndex === row.cells.length - 1 ? 'none' : '1px solid #ddd',
                                        padding: '8px 12px',
                                        background: isHeader ? '#f5f5f5' : '#fff',
                                        fontWeight: isHeader ? 'bold' : 'normal',
                                        textAlign: cell.props?.textAlignment || 'left',
                                        width,
                                    }}
                                >
                                    {t.transformInlineContent(cell.content)}
                                </Column>
                            );
                        })}
                    </Row>
                ))}
            </Section>
        );
    },
    quote: (block) => {
        return <Text>{block.type + " not implemented"}</Text>;
    },
    pageBreak: () => {
        // In email, a page break can be represented as a horizontal rule
        return <hr style={{ border: 'none', borderTop: '2px dashed #ccc', margin: '24px 0' }} />;
    },
};