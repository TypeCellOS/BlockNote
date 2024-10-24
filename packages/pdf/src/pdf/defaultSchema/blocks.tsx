import { DefaultBlockSchema } from "@blocknote/core";
import { Image, Link, Path, Svg, Text } from "@react-pdf/renderer";
import { BlockMapping } from "../../mapping.js";
import {
  BULLET_MARKER,
  CHECK_MARKER_CHECKED,
  CHECK_MARKER_UNCHECKED,
  ListItem,
} from "../util/listItem.js";
import { Table } from "../util/table/Table.js";

const PIXELS_PER_POINT = 0.75;
const FONT_SIZE = 16;

export const pdfBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema,
  any,
  any,
  React.ReactElement<Text>,
  React.ReactElement<Text> | React.ReactElement<Link>
> = {
  paragraph: (block, exporter) => {
    // const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return <Text>{exporter.transformInlineContent(block.content)}</Text>;
  },
  bulletListItem: (block, exporter) => {
    // const style = t(block.props);
    return (
      <ListItem listMarker={BULLET_MARKER}>
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  numberedListItem: (block, exporter, _nestingLevel, numberedListIndex) => {
    // const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    // console.log("NUMBERED LIST ITEM", block.props.textAlignment, style);
    return (
      <ListItem listMarker={`${numberedListIndex}.`}>
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  // would be nice to have pdf checkboxes:
  // https://github.com/diegomura/react-pdf/issues/2103
  checkListItem: (block, exporter) => {
    return (
      <ListItem
        listMarker={
          block.props.checked ? CHECK_MARKER_CHECKED : CHECK_MARKER_UNCHECKED
        }>
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  heading: (block, exporter) => {
    const fontSizeEM =
      block.props.level === 1 ? 2 : block.props.level === 2 ? 1.5 : 1.17;
    return (
      <Text
        style={{
          fontSize: fontSizeEM * FONT_SIZE * PIXELS_PER_POINT,
          fontWeight: 700,
        }}>
        {exporter.transformInlineContent(block.content)}
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
    return (
      // TODO: align, test link, etc
      <Link src={block.props.url}>
        <Svg viewBox="0 0 24 24" fill="currentColor">
          <Path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z" />
        </Svg>
        {/* TODO: caption / name */}
        <Text>{block.props.name}</Text>
      </Link>
    );
  },
  image: async (block, t) => {
    return (
      // <View
      //   style={
      //     {
      //       // width: block.props.previewWidth * PIXELS_PER_POINT,
      //       // ...style,
      //     }
      //   }>
      <>
        <Image
          src={await t.resolveFile(block.props.url)}
          style={{
            width: block.props.previewWidth * PIXELS_PER_POINT,
          }}
        />
        {block.props.caption && (
          <Text
            style={{
              width: block.props.previewWidth * PIXELS_PER_POINT,
              fontSize: FONT_SIZE * 0.8 * PIXELS_PER_POINT,
            }}>
            {block.props.caption}
          </Text>
        )}
      </>
    );
  },
  table: (block, t) => {
    return <Table data={block.content.rows} transformer={t} />;
  },
};
