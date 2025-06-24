import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  DefaultProps,
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import { Fragment } from "react";
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
import { corsProxyResolveFileUrl } from "@shared/api/corsProxy.js";
import { loadFontDataUrl } from "../../../../shared/util/fileUtil.js";

import { Style } from "./types.js";

const FONT_SIZE = 16;
const PIXELS_PER_POINT = 0.75;

type Options = ExporterOptions & {
  /**
   *
   * @default uses the remote emoji source hosted on cloudflare (https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/)
   */
  emojiSource: false | ReturnType<typeof Font.getEmojiSource>;
};

/**
 * Exports a BlockNote document to a .pdf file using the react-pdf library.
 */
export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends Exporter<
  B,
  I,
  S,
  React.ReactElement<Text>,
  React.ReactElement<Link> | React.ReactElement<Text>,
  TextProps["style"],
  React.ReactElement<Text>
> {
  private fontsRegistered = false;

  public styles = StyleSheet.create({
    page: {
      paddingTop: 35,
      paddingBottom: 65,
      paddingHorizontal: 35,
      fontFamily: "Inter",
      fontSize: FONT_SIZE * PIXELS_PER_POINT, //  pixels
      lineHeight: 1.5,
    },
    block: {},
    blockChildren: {},
    header: {},
    footer: {
      position: "absolute",
    },
  });

  public readonly options: Options;

  public constructor(
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    protected readonly schema: BlockNoteSchema<B, I, S>,
    /**
     * The mappings that map the BlockNote schema to the react-pdf content.
     *
     * Pass {@link pdfDefaultSchemaMappings} for the default schema.
     */
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      React.ReactElement<Text>, // RB
      React.ReactElement<Link> | React.ReactElement<Text>, // RI
      TextProps["style"], // RS
      React.ReactElement<Text> // TS
    >["mappings"],
    options?: Partial<Options>,
  ) {
    const defaults = {
      emojiSource: {
        format: "png",
        url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/",
      },
      resolveFileUrl: corsProxyResolveFileUrl,
      colors: COLORS_DEFAULT,
    } satisfies Partial<Options>;

    const newOptions = {
      ...defaults,
      ...options,
    };
    super(schema, mappings, newOptions);
    this.options = newOptions;
  }

  /**
   * Mostly for internal use, you probably want to use `toBlob` or `toReactPDFDocument` instead.
   */
  public transformStyledText(styledText: StyledText<S>) {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);
    return (
      <Text style={styles} key={styledText.text}>
        {styledText.text}
      </Text>
    );
  }

  /**
   * Mostly for internal use, you probably want to use `toBlob` or `toReactPDFDocument` instead.
   */
  public async transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0,
  ): Promise<React.ReactElement<Text>[]> {
    const ret: React.ReactElement<Text>[] = [];
    let numberedListIndex = 0;

    for (const b of blocks) {
      if (b.type === "numberedListItem") {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }
      const children = await this.transformBlocks(b.children, nestingLevel + 1);
      const self = await this.mapBlock(
        b as any,
        nestingLevel,
        numberedListIndex,
      ); // TODO: any

      if (b.type === "pageBreak") {
        ret.push(self);
        continue;
      }

      const style = this.blocknoteDefaultPropsToReactPDFStyle(b.props as any);
      ret.push(
        <Fragment key={b.id}>
          <View
            style={{
              paddingVertical: 3 * PIXELS_PER_POINT,
              ...this.styles.block,
              ...style,
            }}
          >
            {self}
          </View>
          {children.length > 0 && (
            <View
              style={{
                marginLeft: FONT_SIZE * 1.5 * PIXELS_PER_POINT,
                ...this.styles.blockChildren,
              }}
              key={b.id + nestingLevel + "children"}
            >
              {children}
            </View>
          )}
        </Fragment>,
      );
    }

    return ret;
  }

  protected async registerFonts() {
    if (this.fontsRegistered) {
      return;
    }

    if (this.options.emojiSource) {
      Font.registerEmojiSource(this.options.emojiSource);
    }
    let font = await loadFontDataUrl(
      await import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf"),
    );
    Font.register({
      family: "Inter",
      src: font,
    });

    font = await loadFontDataUrl(
      await import("@shared/assets/fonts/inter/Inter_18pt-Italic.ttf"),
    );
    Font.register({
      family: "Inter",
      fontStyle: "italic",
      src: font,
    });

    font = await loadFontDataUrl(
      await import("@shared/assets/fonts/inter/Inter_18pt-Bold.ttf"),
    );
    Font.register({
      family: "Inter",
      src: font,
      fontWeight: "bold",
    });

    font = await loadFontDataUrl(
      await import("@shared/assets/fonts/inter/Inter_18pt-BoldItalic.ttf"),
    );
    Font.register({
      family: "Inter",
      fontStyle: "italic",
      src: font,
      fontWeight: "bold",
    });

    font = await loadFontDataUrl(
      await import("@shared/assets/fonts/GeistMono-Regular.ttf"),
    );
    Font.register({
      family: "GeistMono",
      src: font,
    });

    this.fontsRegistered = true;
  }

  /**
   * Convert a document (array of Blocks) to a react-pdf Document.
   */
  public async toReactPDFDocument(
    blocks: Block<B, I, S>[],
    options: {
      /**
       * Add a header to every page.
       * The React component passed must be a React-PDF component
       */
      header?: React.ReactElement;
      /**
       * Add a footer to every page.
       * The React component passed must be a React-PDF component
       */
      footer?: React.ReactElement;
    } = {},
  ) {
    await this.registerFonts();

    return (
      <Document>
        <Page dpi={100} size="A4" style={this.styles.page}>
          {options.header && (
            <View fixed style={this.styles.header}>
              {options.header}
            </View>
          )}
          {await this.transformBlocks(blocks)}
          {options.footer && (
            <View
              fixed
              style={[
                {
                  left: this.styles.page.paddingHorizontal || 0,
                  bottom: (this.styles.page.paddingBottom || 0) / 2,
                  right: this.styles.page.paddingHorizontal || 0,
                },
                this.styles.footer,
              ]}
            >
              {options.footer}
            </View>
          )}
        </Page>
      </Document>
    );
  }

  protected blocknoteDefaultPropsToReactPDFStyle(
    props: Partial<DefaultProps>,
  ): Style {
    return {
      textAlign: props.textAlignment,
      backgroundColor:
        props.backgroundColor === "default" || !props.backgroundColor
          ? undefined
          : this.options.colors[
              props.backgroundColor as keyof typeof this.options.colors
            ].background,
      color:
        props.textColor === "default" || !props.textColor
          ? undefined
          : this.options.colors[
              props.textColor as keyof typeof this.options.colors
            ].text,
      alignItems:
        props.textAlignment === "right"
          ? "flex-end"
          : props.textAlignment === "center"
            ? "center"
            : undefined,
    };
  }
}
