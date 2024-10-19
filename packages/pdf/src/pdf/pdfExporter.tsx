import {
  Block,
  BlockFromConfig,
  BlockNoteSchema,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";

import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  TextProps,
  View,
} from "@react-pdf/renderer";

import {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "../mapping.js";
import { loadFontDataUrl } from "./util/loadFontDataUrl.js";

const FONT_SIZE = 16;
const PIXELS_PER_POINT = 0.75;
export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> {
  public constructor(
    public readonly schema: BlockNoteSchema<B, I, S>,
    public readonly mappings: {
      styleMapping: StyleMapping<NoInfer<S>, TextProps["style"]>;
      blockMapping: BlockMapping<
        B,
        I,
        S,
        React.ReactElement<Text>,
        React.ReactElement<Text>
      >;
      inlineContentMapping: InlineContentMapping<
        I,
        S,
        React.ReactElement<Link> | React.ReactElement<Text>,
        React.ReactElement<Text>
      >;
    }
  ) // public readonly options: {
  //   resolveFileUrl: (url: string) => Promise<string>;
  // }
  {}

  public transformStyledText(styledText: StyledText<S>) {
    const stylesArray = Object.entries(styledText.styles).map(
      ([key, value]) => {
        const mappedStyle = this.mappings.styleMapping[key](value);
        return mappedStyle;
      }
    );
    const styles = Object.assign({}, ...stylesArray);
    return <Text style={styles}>{styledText.text}</Text>;
  }

  public transformInlineContent(inlineContent: InlineContent<I, S>) {
    return this.mappings.inlineContentMapping[inlineContent.type](
      inlineContent,
      this.transformStyledText.bind(this)
    );
  }

  public transformInlineContentArray(
    inlineContentArray: InlineContent<I, S>[]
  ) {
    return (
      <Text>
        {inlineContentArray.map((ic) => this.transformInlineContent(ic))}
      </Text>
    );
  }

  // TODO: 3px top and bottom padding
  public transformBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number,
    numberedListIndex: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this.transformInlineContentArray.bind(this) as any, // not ideal as any
      nestingLevel,
      numberedListIndex
    );
  }

  public transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0
  ): React.ReactElement<Text>[] {
    let numberedListIndex = 0;
    return blocks.map((b) => {
      if (b.type === "numberedListItem") {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }
      const children = this.transformBlocks(b.children, nestingLevel + 1);
      const self = this.transformBlock(
        b as any,
        nestingLevel,
        numberedListIndex
      ); // TODO: any

      return (
        <>
          <View style={{ paddingVertical: 3 * PIXELS_PER_POINT }}>{self}</View>
          {children.length > 0 && (
            <View style={{ marginLeft: FONT_SIZE * 1.5 * PIXELS_PER_POINT }}>
              {children}
            </View>
          )}
        </>
      );
    });
  }

  public createStyles() {
    return StyleSheet.create({
      page: {
        paddingTop: 35,
        paddingBottom: 65,
        paddingHorizontal: 35,
        fontFamily: "Inter",
        fontSize: FONT_SIZE * PIXELS_PER_POINT, //  pixels
        lineHeight: 1.5,
        // flexDirection: "row",
        // backgroundColor: "#E4E4E4",
      },
      section: {
        // margin: 10,
        // padding: 10,
        // flexGrow: 1,
      },
    });
  }

  public async registerFonts() {
    let font = await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Regular.ttf")
    );
    Font.register({
      family: "Inter",
      src: font,
    });

    font = await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Italic.ttf")
    );
    Font.register({
      family: "Inter",
      fontStyle: "italic",
      src: font,
    });

    font = await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Bold.ttf")
    );
    Font.register({
      family: "Inter",
      src: font,
      fontWeight: "bold",
    });

    font = await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-BoldItalic.ttf")
    );
    Font.register({
      family: "Inter",
      fontStyle: "italic",
      src: font,
      fontWeight: "bold",
    });
  }

  public async toReactPDFDocument(blocks: Block<B, I, S>[]) {
    await this.registerFonts();
    const styles = this.createStyles();
    return (
      <Document>
        <Page dpi={100} size="A4" style={styles.page}>
          <View style={styles.section}>{this.transformBlocks(blocks)}</View>
          {/* <View>

        <Text>hello world no font set</Text>
        <Text
          style={{
            fontFamily: "Inter",
            // fontWeight: "bold",
            // fontStyle: "italic",
          }}>
          hello world
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "bold",
            // fontStyle: "italic",
          }}>
          hello world bold
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontStyle: "italic",
          }}>
          hello world italic
        </Text>

        <Text>Section #1</Text>
        <Text>Section #2</Text>
      </View>
      <View>

        <Text>Section #3</Text>
        <Text>Section #4</Text>
      </View> */}
        </Page>
      </Document>
    );
  }
}
