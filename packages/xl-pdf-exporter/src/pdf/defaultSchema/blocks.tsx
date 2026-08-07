import {
  BlockMapping,
  DefaultBlockSchema,
  DefaultProps,
  createPageBreakBlockConfig,
} from "@blocknote/core";
import { multiColumnSchema } from "@blocknote/xl-multi-column";
import { Image, Link, Path, Svg, Text, View } from "@react-pdf/renderer";
import {
  BULLET_MARKER,
  CHECK_MARKER_CHECKED,
  CHECK_MARKER_UNCHECKED,
  CHEVRON_MARKER,
  ListItem,
} from "../util/listItem.js";
import { Table } from "../util/table/Table.js";
import { Style } from "../types.js";
import {
  BLOCK_VERTICAL_PADDING,
  PAGE_HEIGHT,
  type PDFExporter,
} from "../pdfExporter.js";

const PIXELS_PER_POINT = 0.75;
const FONT_SIZE = 16;
const CAPTION_FONT_SIZE = FONT_SIZE * 0.8 * PIXELS_PER_POINT;

export const pdfBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema & {
    pageBreak: ReturnType<typeof createPageBreakBlockConfig>;
  } & typeof multiColumnSchema.blockSchema,
  any,
  any,
  React.ReactElement<Text>,
  React.ReactElement<Text> | React.ReactElement<Link>
> = {
  paragraph: (block, exporter) => {
    // const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    return (
      <Text key={"paragraph" + block.id}>
        {exporter.transformInlineContent(block.content)}
      </Text>
    );
  },
  toggleListItem: (block, exporter) => {
    return (
      <ListItem listMarker={CHEVRON_MARKER}>
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  bulletListItem: (block, exporter) => {
    // const style = t(block.props);
    return (
      <ListItem listMarker={BULLET_MARKER} key={"bulletListItem" + block.id}>
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  numberedListItem: (block, exporter, _nestingLevel, numberedListIndex) => {
    // const style = blocknoteDefaultPropsToReactPDFStyle(block.props);
    // console.log("NUMBERED LIST ITEM", block.props.textAlignment, style);
    return (
      <ListItem
        listMarker={`${numberedListIndex}.`}
        key={"numberedListItem" + block.id}
      >
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
        }
        key={"checkListItem" + block.id}
      >
        <Text>{exporter.transformInlineContent(block.content)}</Text>
      </ListItem>
    );
  },
  heading: (block, exporter) => {
    const levelFontSizeEM = {
      1: 2,
      2: 1.5,
      3: 1.17,
      4: 1,
      5: 0.83,
      6: 0.67,
    }[block.props.level as 1 | 2 | 3 | 4 | 5 | 6];
    return (
      <Text
        key={"heading" + block.id}
        style={{
          fontSize: levelFontSizeEM * FONT_SIZE * PIXELS_PER_POINT,
          lineHeight: 1.25,
          fontWeight: 700,
        }}
      >
        {exporter.transformInlineContent(block.content)}
      </Text>
    );
  },
  quote: (block, exporter) => {
    return (
      <Text
        key={"quote" + block.id}
        style={{
          borderLeft: "#7D797A",
          color: "#7D797A",
          paddingLeft: 9.5 * PIXELS_PER_POINT,
        }}
      >
        {exporter.transformInlineContent(block.content)}
      </Text>
    );
  },
  codeBlock: (block) => {
    // Code blocks hold plain content: at most a single unstyled text item.
    const [textItem, ...excessItems] = block.content;
    if (excessItems.length > 0 || (textItem && !("text" in textItem))) {
      throw new Error("expected plain block content to be a single text item");
    }
    const textContent = textItem?.text ?? "";
    const lines = textContent.split("\n").map((line, index) => {
      const indent = line.match(/^\s*/)?.[0].length || 0;

      return (
        <Text
          key={`line_${index}` + block.id}
          style={{
            marginLeft: indent * 9.5 * PIXELS_PER_POINT,
          }}
        >
          {line.trimStart() || <>&nbsp;</>}
        </Text>
      );
    });

    return (
      <View
        wrap={false}
        style={{
          padding: 24 * PIXELS_PER_POINT,
          border: "1px solid #000000",
          lineHeight: 1.25,
          fontSize: FONT_SIZE * PIXELS_PER_POINT,
          fontFamily: "GeistMono",
        }}
        key={"codeBlock" + block.id}
      >
        {lines}
      </View>
    );
  },
  pageBreak: () => {
    return <View break key={"pageBreak"} />;
  },
  divider: () => {
    return (
      <View
        style={{
          borderTop: "1px solid #ccc",
          marginTop: 11.5 * PIXELS_PER_POINT,
          marginBottom: 11.5 * PIXELS_PER_POINT,
        }}
      />
    );
  },
  column: (block, _exporter, _nestingLevel, _numberedListIndex, children) => {
    return <View style={{ flex: block.props.width }}>{children}</View>;
  },
  columnList: (
    _block,
    _exporter,
    _nestingLevel,
    _numberedListIndex,
    children,
  ) => {
    return (
      <View
        style={{
          display: "flex",
          gap: 8 * PIXELS_PER_POINT,
          flexDirection: "row",
        }}
      >
        {children}
      </View>
    );
  },
  audio: (block, exporter) => {
    return (
      <View wrap={false} key={"audio" + block.id}>
        {file(
          block.props,
          "Open audio file",
          <Svg height={14} width={14} viewBox="0 0 24 24" fill="currentColor">
            <Path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z"></Path>
          </Svg>,
          exporter,
        )}
        {caption(block.props, exporter)}
      </View>
    );
  },
  video: (block, exporter) => {
    return (
      <View wrap={false} key={"video" + block.id}>
        {file(
          block.props,
          "Open video file",
          <Svg height={14} width={14} viewBox="0 0 24 24" fill="currentColor">
            <Path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z" />
          </Svg>,
          exporter,
        )}
        {caption(block.props, exporter)}
      </View>
    );
  },
  file: (block, exporter) => {
    return (
      <View wrap={false} key={"file" + block.id}>
        {file(
          block.props,
          "Open file",
          <Svg height={16} width={16} viewBox="0 0 24 24" fill="currentColor">
            <Path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z" />
          </Svg>,
          exporter,
        )}
        {caption(block.props, exporter)}
      </View>
    );
  },
  image: async (block, t) => {
    return (
      <View wrap={false} key={"image" + block.id}>
        <Image
          src={await t.resolveFile(block.props.url)}
          style={imageStyle(block.props, t)}
        />
        {caption(block.props, t)}
      </View>
    );
  },
  table: (block, t) => {
    return (
      <Table data={block.content} transformer={t} key={"table" + block.id} />
    );
  },
};

function file(
  props: Partial<DefaultProps & { name: string; url: string }>,
  defaultText: string,
  icon: React.ReactElement<Svg>,
  _exporter: any,
) {
  const PIXELS_PER_POINT = 0.75;
  return (
    <Link src={props.url} key={"file" + props.url}>
      <View
        style={{
          display: "flex",
          gap: 8 * PIXELS_PER_POINT,
          flexDirection: "row",
        }}
      >
        {icon}
        <Text>{props.name || defaultText}</Text>
      </View>
    </Link>
  );
}

function previewWidthToPoints(
  props: Partial<DefaultProps & { previewWidth: number }>,
): number | undefined {
  return props.previewWidth ? props.previewWidth * PIXELS_PER_POINT : undefined;
}

// Style values can also be strings ("10pt", "5%"); the page styles set in
// `PDFExporter` are plain numbers, so treat anything else as the fallback.
function points(value: number | string | undefined, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function imageStyle(
  props: Partial<DefaultProps & { caption: string; previewWidth: number }>,
  exporter: any,
): Style {
  const page: Style =
    (exporter as PDFExporter<any, any, any>).styles?.page ?? {};
  return {
    width: previewWidthToPoints(props),
    maxWidth: "100%",
    // Images can't break across pages, so cap the box to the usable page
    // height (accounting for the padding `transformBlocks` adds around every
    // block); a taller box would spill an empty page after the bitmap. If
    // there's a caption, also reserve one line for it. Known limitations:
    // captions long enough to wrap, and headers passed to
    // `toReactPDFDocument` (which take flow height on every page), can still
    // make the unbreakable image group spill.
    maxHeight:
      PAGE_HEIGHT -
      points(page.paddingTop, 0) -
      points(page.paddingBottom, 0) -
      2 * BLOCK_VERTICAL_PADDING -
      (props.caption ? CAPTION_FONT_SIZE * points(page.lineHeight, 1.5) : 0),
    // `contain` leaves slack inside the box when it's clamped by `maxWidth`
    // or `maxHeight`, so pin the bitmap to the block's alignment edge. The
    // box itself is aligned by `blocknoteDefaultPropsToReactPDFStyle` on the
    // wrapper.
    objectFit: "contain",
    objectPosition:
      props.textAlignment === "right"
        ? "100% 0%"
        : props.textAlignment === "center"
          ? "50% 0%"
          : "0% 0%",
  };
}

function caption(
  props: Partial<DefaultProps & { caption: string; previewWidth: number }>,
  _exporter: any,
) {
  if (!props.caption) {
    return undefined;
  }
  return (
    <Text
      key={"caption" + props.caption}
      style={{
        width: previewWidthToPoints(props),
        maxWidth: "100%",
        fontSize: CAPTION_FONT_SIZE,
      }}
    >
      {props.caption}
    </Text>
  );
}
