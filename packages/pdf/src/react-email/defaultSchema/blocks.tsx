import {
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Heading, Img, Link, Text } from "@react-email/components";
import { BlockMapping } from "../../mapping.js";

export const reactEmailBlockMappingForDefaultSchema = {
  paragraph: (block, inlineContentTransformer) => {
    return <Text>{inlineContentTransformer(block.content)}</Text>;
  },
  bulletListItem: (block, inlineContentTransformer) => {
    // TODO
    return (
      <Text>
        <Text>• </Text>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </Text>
    );
  },
  numberedListItem: (block, inlineContentTransformer) => {
    // TODO
    return (
      <Text>
        <Text>•</Text>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </Text>
    );
  },
  // TODO
  checkListItem: (block, inlineContentTransformer) => {
    return (
      <Text>
        <Text>•</Text>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </Text>
    );
  },
  heading: (block, inlineContentTransformer) => {
    // TODO
    return (
      <Heading as={`h${block.props.level}`}>
        {inlineContentTransformer(block.content)}
      </Heading>
    );
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
        alt={block.props.caption}
      />
    );
  },
  table: (block) => {
    return <Text>{block.type + " not implemented"}</Text>;
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
  React.ReactElement<any>,
  React.ReactElement<typeof Link> | React.ReactElement<typeof Text>
>;
