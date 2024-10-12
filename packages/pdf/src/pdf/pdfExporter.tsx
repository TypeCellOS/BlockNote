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
  ) {}

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

  public transformBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this.transformInlineContentArray.bind(this) as any, // not ideal as any
      nestingLevel
    );
  }

  public transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0
  ): React.ReactElement<Text>[] {
    return blocks.map((b) => {
      const children = this.transformBlocks(b.children, nestingLevel + 1);
      const self = this.transformBlock(b as any, nestingLevel); // TODO: any

      return (
        <>
          {self}
          {children.length > 0 && (
            <View style={{ marginLeft: 10 }}>{children}</View>
          )}
        </>
      );
    });
  }

  public createStyles() {
    return StyleSheet.create({
      page: {
        fontFamily: "Inter",
        fontSize: 12,
        lineHeight: 1.5,
        // flexDirection: "row",
        // backgroundColor: "#E4E4E4",
      },
      section: {
        margin: 10,
        padding: 10,
        // flexGrow: 1,
      },
    });
  }

  public registerFonts() {
    if (import.meta.env.NODE_ENV === "test") {
      let font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Regular.ttf");
      Font.register({
        family: "Inter",
        src: font,
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Italic.ttf");
      Font.register({
        family: "Inter",
        fontStyle: "italic",
        src: font,
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Bold.ttf");
      Font.register({
        family: "Inter",
        src: font,
        fontWeight: "bold",
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-BoldItalic.ttf");
      Font.register({
        family: "Inter",
        fontStyle: "italic",
        src: font,
        fontWeight: "bold",
      });
    } else {
      // eslint-disable-next-line no-console
      console.error("TODO");
    }
  }

  public toReactPDFDocument(blocks: Block<B, I, S>[]) {
    this.registerFonts();
    const styles = this.createStyles();
    return (
      <Document>
        <Page size="A4" style={styles.page}>
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
