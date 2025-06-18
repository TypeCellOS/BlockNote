import { DefaultBlockSchema } from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import { Heading, Img, Link, Text } from "@react-email/components";
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
        // TODO
        return (
            <Text>
                <Text>• </Text>
                <Text>{t.transformInlineContent(block.content)}</Text>
            </Text>
        );
    },
    numberedListItem: (block, t) => {
        // TODO
        return (
            <Text>
                <Text>•</Text>
                <Text>{t.transformInlineContent(block.content)}</Text>
            </Text>
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
        return <Text>{block.type + " not implemented"}</Text>;
    },
    audio: (block) => {
        // TODO
        return <Text>{block.type + " not implemented"}</Text>;
    },
    video: (block) => {
        return <Text>{block.type + " not implemented"}</Text>;
    },
    file: (block) => {
        return <Text>{block.type + " not implemented"}</Text>;
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