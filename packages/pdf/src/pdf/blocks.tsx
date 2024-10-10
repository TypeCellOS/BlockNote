import { BlockNoteSchema } from "@blocknote/core";
import { Image, Text } from "@react-pdf/renderer";
import { mappingFactory } from "../mapping";

export function docxBlockMappingForDefaultSchema(
  inlineContentTransformer: (
    inlineContent: any // TODO
  ) => React.ReactElement<Text>
) {
  function createContent<T>(content: T[]): React.ReactElement<Text> {
    console.log(content);
    return (
      <Text>
        {content.map((content) => {
          return inlineContentTransformer(content);
          // return <Text>test</Text>;
        })}
      </Text>
    );
  }

  return mappingFactory(BlockNoteSchema.create()).createBlockMapping<
    React.ReactElement<Text>
  >({
    paragraph: (block) => {
      return <Text>{createContent(block.content)}</Text>;
    },
    bulletListItem: (block) => {
      return (
        <Text>
          <Text>• </Text>
          <Text>{createContent(block.content)}</Text>
        </Text>
      );
    },
    numberedListItem: (block) => {
      // TODO
      return (
        <Text>
          <Text>•</Text>
          <Text>{createContent(block.content)}</Text>
        </Text>
      );
    },
    // TODO
    checkListItem: (block) => {
      return (
        <Text>
          <Text>•</Text>
          <Text>{createContent(block.content)}</Text>
        </Text>
      );
    },
    heading: (block) => {
      // TODO
      return (
        <Text style={{ fontSize: 30 }}>{createContent(block.content)}</Text>
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
  });
}
