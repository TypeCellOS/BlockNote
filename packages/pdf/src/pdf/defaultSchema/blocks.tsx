import {
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Image, Text } from "@react-pdf/renderer";
import { BlockMapping } from "../../mapping";

export const pdfBlockMappingForDefaultSchema = {
  paragraph: (block, inlineContentTransformer) => {
    return <Text>{inlineContentTransformer(block.content)}</Text>;
  },
  bulletListItem: (block, inlineContentTransformer) => {
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
      <Text style={{ fontSize: 30 }}>
        {inlineContentTransformer(block.content)}
      </Text>
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
    return <Image src={block.props.url} />;
  },
  table: (block) => {
    return <Text>{block.type + " not implemented"}</Text>;
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
  React.ReactElement<Text>,
  React.ReactElement<Text>
>;
