import { DefaultBlockSchema, StyledText } from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import { CodeBlock, CodeInline, dracula, Font, Heading, Img, Link, Text,} from "@react-email/components";
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
        return (
            <Text>
                <Text>•</Text>
                <Text>{t.transformInlineContent(block.content)}</Text>
            </Text>
        );
    },
    heading: (block, t) => {
        // TODO
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
    table: (block) => {
        return <Text>{block.type + " not implemented"}</Text>;
    },
    quote: (block) => {
        return <Text>{block.type + " not implemented"}</Text>;
    },
    pageBreak: () => {
        // In email, a page break can be represented as a horizontal rule
        return <hr style={{ border: 'none', borderTop: '2px dashed #ccc', margin: '24px 0' }} />;
    },
};