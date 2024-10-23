import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  DefaultProps,
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
import { Exporter } from "../Exporter.js";
import { loadFontDataUrl } from "../util/fileUtil.js";
import { Style } from "./types.js";

const FONT_SIZE = 16;
const PIXELS_PER_POINT = 0.75;

export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> extends Exporter<
  B,
  I,
  S,
  React.ReactElement<Text>,
  React.ReactElement<Link> | React.ReactElement<Text>,
  TextProps["style"],
  React.ReactElement<Text>
> {
  public constructor(
    public readonly schema: BlockNoteSchema<B, I, S>,
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      React.ReactElement<Text>, // RB
      React.ReactElement<Link> | React.ReactElement<Text>, // RI
      TextProps["style"], // RS
      React.ReactElement<Text> // TS
    >["mappings"],
    options?: {
      resolveFileUrl: (url: string) => Promise<string | Blob>;
    }
  ) {
    super(schema, mappings, options || {});
  }

  public transformStyledText(styledText: StyledText<S>) {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);
    return <Text style={styles}>{styledText.text}</Text>;
  }

  public async transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0
  ): Promise<React.ReactElement<Text>[]> {
    let numberedListIndex = 0;
    const promises = blocks.map(async (b) => {
      if (b.type === "numberedListItem") {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }
      const children = await this.transformBlocks(b.children, nestingLevel + 1);
      const self = await this.mapBlock(
        b as any,
        nestingLevel,
        numberedListIndex
      ); // TODO: any

      const style = this.blocknoteDefaultPropsToReactPDFStyle(b.props as any);
      return (
        <>
          <View style={{ paddingVertical: 3 * PIXELS_PER_POINT, ...style }}>
            {self}
          </View>
          {children.length > 0 && (
            <View style={{ marginLeft: FONT_SIZE * 1.5 * PIXELS_PER_POINT }}>
              {children}
            </View>
          )}
        </>
      );
    });
    const ret = await Promise.all(promises);
    return ret;
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
          <View style={styles.section}>
            {await this.transformBlocks(blocks)}
          </View>
        </Page>
      </Document>
    );
  }

  protected blocknoteDefaultPropsToReactPDFStyle(
    props: Partial<DefaultProps>
  ): Style {
    return {
      textAlign: props.textAlignment,
      backgroundColor:
        props.backgroundColor === "default" ? undefined : props.backgroundColor,
      color: props.textColor,
      alignItems:
        props.textAlignment === "right"
          ? "flex-end"
          : props.textAlignment === "center"
          ? "center"
          : undefined,
    };
  }
}
