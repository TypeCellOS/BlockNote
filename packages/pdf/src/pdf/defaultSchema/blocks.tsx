import {
  DefaultBlockSchema,
  DefaultProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Image, Text } from "@react-pdf/renderer";
import { BlockMapping } from "../../mapping.js";
import { Style } from "../types.js";
import {
  BULLET_MARKER,
  CHECK_MARKER_CHECKED,
  CHECK_MARKER_UNCHECKED,
  ListItem,
} from "../util/listItem.js";
import { Table } from "../util/table/Table.js";

const PIXELS_PER_POINT = 0.75;
const FONT_SIZE = 16;

export function blocknoteDefaultPropsToReactPDFStyle(
  props: DefaultProps
): Style {
  return {
    textAlign: props.textAlignment,
    backgroundColor:
      props.backgroundColor === "default" ? undefined : props.backgroundColor,
    color: props.textColor,
    alignSelf:
      props.textAlignment === "right"
        ? "flex-end"
        : props.textAlignment === "center"
        ? "center"
        : undefined,
  };
}

export const pdfBlockMappingForDefaultSchema = {
  paragraph: (block, inlineContentTransformer) => {
    const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return <Text style={style}>{inlineContentTransformer(block.content)}</Text>;
  },
  bulletListItem: (block, inlineContentTransformer) => {
    const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return (
      <ListItem listMarker={BULLET_MARKER} style={style}>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </ListItem>
    );
  },
  numberedListItem: (
    block,
    inlineContentTransformer,
    _nestingLevel,
    numberedListIndex
  ) => {
    const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    // console.log("NUMBERED LIST ITEM", block.props.textAlignment, style);
    return (
      <ListItem listMarker={`${numberedListIndex}.`} style={style}>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </ListItem>
    );
  },
  // TODO
  checkListItem: (block, inlineContentTransformer) => {
    const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return (
      <ListItem
        listMarker={
          block.props.checked ? CHECK_MARKER_CHECKED : CHECK_MARKER_UNCHECKED
        }
        style={style}>
        <Text>{inlineContentTransformer(block.content)}</Text>
      </ListItem>
    );
  },
  heading: (block, inlineContentTransformer) => {
    const fontSizeEM =
      block.props.level === 1 ? 2 : block.props.level === 2 ? 1.5 : 1.17;
    const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return (
      <Text
        style={{
          ...style,

          fontSize: fontSizeEM * FONT_SIZE * PIXELS_PER_POINT,
          fontWeight: 700,
        }}>
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
  table: (block, inlineContentTransformer) => {
    return (
      <Table
        data={block.content.rows}
        inlineContentTransformer={inlineContentTransformer}
      />
    );
  },
} satisfies BlockMapping<
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
  React.ReactElement<Text>,
  React.ReactElement<Text>
>;
