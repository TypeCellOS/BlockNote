import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import {
  AlignmentType,
  CarriageReturn,
  Document,
  IRunPropertiesOptions,
  ISectionOptions,
  LevelFormat,
  Packer,
  Paragraph,
  ParagraphChild,
  Tab,
  Table,
  TextRun,
} from "docx";

import { Exporter, ExporterOptions } from "@blocknote/core";
import { corsProxyResolveFileUrl } from "@shared/api/corsProxy.js";
import { loadFileBuffer } from "@shared/util/fileUtil.js";
import { DOCX_LIST_LEVEL_COUNT } from "./listLevels.js";

// get constructor arg type from Document
type DocumentOptions = Partial<ConstructorParameters<typeof Document>[0]>;

const DEFAULT_TAB_STOP =
  /* default font size */ 16 *
  /* 1 pixel is 0.75 points */ 0.75 *
  /* 1.5em*/ 1.5 *
  /* 1 point is 20 twips */ 20;

/**
 * Exports a BlockNote document to a .docx file using the docxjs library.
 */
export class DOCXExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends Exporter<
  B,
  I,
  S,
  Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table,
  ParagraphChild,
  IRunPropertiesOptions,
  TextRun
> {
  public constructor(
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    protected readonly schema: BlockNoteSchema<B, I, S>,
    /**
     * The mappings that map the BlockNote schema to the docxjs content.
     * Pass {@link docxDefaultSchemaMappings} for the default schema.
     */
    protected readonly mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      | Promise<Paragraph[] | Paragraph | Table>
      | Paragraph[]
      | Paragraph
      | Table,
      ParagraphChild,
      IRunPropertiesOptions,
      TextRun
    >["mappings"],
    options?: Partial<ExporterOptions>,
  ) {
    const defaults = {
      colors: COLORS_DEFAULT,
      resolveFileUrl: corsProxyResolveFileUrl,
    } satisfies Partial<ExporterOptions>;

    const newOptions = {
      ...defaults,
      ...options,
    };
    super(schema, mappings, newOptions);
  }

  /**
   * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
   */
  public transformStyledText(styledText: StyledText<S>, hyperlink?: boolean) {
    const stylesArray = this.mapStyles(styledText.styles);

    const styles: IRunPropertiesOptions = Object.assign(
      {} as IRunPropertiesOptions,
      ...stylesArray,
    );

    // A hard line break (shift+enter) arrives as "\n" inside the text. A raw
    // LF inside <w:t> is ignored by Word, so the lines are emitted with
    // explicit break elements (<w:cr/>) between them instead.
    const lines = styledText.text.split("\n");
    return new TextRun({
      ...styles,
      style: hyperlink ? "Hyperlink" : styles.style,
      ...(lines.length === 1
        ? { text: styledText.text }
        : {
            children: lines.flatMap((line, index) =>
              index === 0 ? [line] : [new CarriageReturn(), line],
            ),
          }),
    });
  }

  /**
   * A document-global counter used to hand every distinct list its own numbering
   * instance (and therefore its own `w:numId`). Two lists that share a `numId`
   * are treated by Word as one continued list, so without this all lists in a
   * document number/bullet as if they were a single list. See issue #2225.
   */
  private numberingInstanceCounter = 0;

  /**
   * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
   */
  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0,
  ): Promise<Array<Paragraph | Table>> {
    const ret: Array<Paragraph | Table> = [];

    // The top-level call starts a fresh document, so restart instance numbering.
    if (nestingLevel === 0) {
      this.numberingInstanceCounter = 0;
    }

    // A list in Word is a maximal run of consecutive sibling list items of the
    // same type; a break (any other block) or a switch between bullet/numbered
    // starts a new list. Each such run gets its own numbering instance so it
    // renders as a separate list rather than continuing the previous one.
    let runListType: string | undefined;
    let runInstance = 0;

    for (const b of blocks) {
      let numberingInstance = 0;
      if (b.type === "bulletListItem" || b.type === "numberedListItem") {
        if (b.type !== runListType) {
          runInstance = ++this.numberingInstanceCounter;
          runListType = b.type;
        }
        numberingInstance = runInstance;
      } else {
        runListType = undefined;
      }

      let children = await this.transformBlocks(b.children, nestingLevel + 1);

      if (!this.isContainerBlock(b.type)) {
        children = children.map((c, _i) => {
          // NOTE: nested tables not supported (we can't insert the new Tab before a table)
          if (
            c instanceof Paragraph &&
            !(c as any).properties.numberingReferences.length
          ) {
            c.addRunToFront(
              new TextRun({
                children: [new Tab()],
              }),
            );
          }
          return c;
        });
      }

      // The `numberedListIndex` slot carries the numbering instance for the docx
      // block mappings (bullet/numbered list items); other block types ignore it.
      const self = await this.mapBlock(
        b as any,
        nestingLevel,
        numberingInstance,
        children,
      ); // TODO: any
      if (this.isContainerBlock(b.type)) {
        ret.push(self as Table);
      } else if (Array.isArray(self)) {
        ret.push(...self, ...children);
      } else {
        ret.push(self, ...children);
      }
    }
    return ret;
  }

  protected async getFonts(): Promise<DocumentOptions["fonts"]> {
    // Unfortunately, loading the variable font doesn't work
    // "./src/fonts/Inter-VariableFont_opsz,wght.ttf",

    const interFont = await loadFileBuffer(
      await import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf"),
    );
    const geistMonoFont = await loadFileBuffer(
      await import("@shared/assets/fonts/GeistMono-Regular.ttf"),
    );

    // `docx` requires each font's `data` to be a Node `Buffer`. We derive the
    // exact expected type from `docx` itself (rather than referencing the
    // global `Buffer` type, which isn't available in this package's tsconfig).
    type FontData = NonNullable<DocumentOptions["fonts"]>[number]["data"];

    // In the browser `loadFileBuffer` resolves to an `ArrayBuffer`, which
    // `docx` doesn't accept, so we convert it to a `Buffer` using the `buffer/`
    // polyfill. In Node it's already a `Buffer` and can be used as-is.
    // NOTE: the buffer/ import is intentional and as documented in the `buffer`
    // package usage instructions:
    // https://github.com/feross/buffer?tab=readme-ov-file#usage
    const toFontData = async (
      font: Awaited<ReturnType<typeof loadFileBuffer>>,
    ): Promise<FontData> => {
      if (font instanceof ArrayBuffer) {
        const BufferPolyfill = (await import("buffer/")).Buffer;
        return BufferPolyfill.from(font) as unknown as FontData;
      }
      return font as unknown as FontData;
    };

    return [
      { name: "Inter", data: await toFontData(interFont) },
      {
        name: "GeistMono",
        data: await toFontData(geistMonoFont),
      },
    ];
  }

  protected async createDefaultDocumentOptions(
    locale?: string,
  ): Promise<DocumentOptions> {
    let externalStyles = (await import("./template/word/styles.xml?raw"))
      .default;

    // Replace the language in styles.xml with the provided locale, or remove
    // the w:lang element entirely if no locale is provided (per ECMA-376
    // §17.3.2.20: omitting w:lang lets the application auto-detect language).
    const trimmedLocale = locale?.trim();
    if (trimmedLocale) {
      externalStyles = externalStyles.replace(
        /(<w:lang\b[^>]*\bw:val=")([^"]+)("[^>]*\/>)/g,
        (_match, prefix, _oldVal, suffix) =>
          `${prefix}${trimmedLocale}${suffix}`,
      );
    } else {
      externalStyles = externalStyles.replace(/\s*<w:lang\b[^>]*\/>/g, "");
    }

    // Cycle bullet symbols by depth (filled disc, hollow circle, filled
    // square), the same convention Word/LibreOffice/Google Docs use, so nested
    // bullet levels are visually distinct instead of all rendering as "•"
    // (#2226). These Unicode glyphs render in the document font, so they don't
    // depend on Symbol/Wingdings being installed.
    const bullets = ["•", "○", "▪"];
    return {
      numbering: {
        config: [
          {
            reference: "blocknote-numbered-list",
            levels: Array.from({ length: DOCX_LIST_LEVEL_COUNT }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.DECIMAL,
              text: `%${i + 1}.`,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
          {
            reference: "blocknote-bullet-list",
            levels: Array.from({ length: DOCX_LIST_LEVEL_COUNT }, (_, i) => ({
              start: 1,
              level: i,
              format: LevelFormat.BULLET,
              text: bullets[i % bullets.length],
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: DEFAULT_TAB_STOP * (i + 1),
                    hanging: DEFAULT_TAB_STOP,
                  },
                },
              },
            })),
          },
        ],
      },
      fonts: await this.getFonts(),
      defaultTabStop: 200,
      externalStyles,
    };
  }

  /**
   * Converts blocks to a .docx Blob with optional locale support.
   */
  public async toBlob(
    blocks: Block<B, I, S>[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
      /**
       * The document locale in OOXML format (e.g. en-US, fr-FR, de-DE).
       * If omitted, no language is set and the consuming application will use its own default.
       */
      locale?: string;
    } = {
      sectionOptions: {},
      documentOptions: {},
    },
  ) {
    const doc = await this.toDocxJsDocument(blocks, options);
    type GlobalThis = typeof globalThis & { Buffer?: any };
    const prevBuffer = (globalThis as GlobalThis).Buffer;
    try {
      if (!(globalThis as GlobalThis).Buffer) {
        // load Buffer polyfill because docxjs requires this
        (globalThis as GlobalThis).Buffer = (
          await import("buffer")
        ).default.Buffer;
      }
      return Packer.toBlob(doc);
    } finally {
      (globalThis as GlobalThis).Buffer = prevBuffer;
    }
  }

  /**
   * Converts blocks to a docxjs Document with optional locale support.
   */
  public async toDocxJsDocument(
    blocks: Block<B, I, S>[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
      /**
       * The document locale in OOXML format (e.g. en-US, fr-FR, de-DE).
       * If omitted, no language is set and the consuming application will use its own default.
       */
      locale?: string;
    } = {
      sectionOptions: {},
      documentOptions: {},
    },
  ) {
    const doc = new Document({
      ...(await this.createDefaultDocumentOptions(options.locale)),
      ...options.documentOptions,
      sections: [
        {
          children: await this.transformBlocks(blocks),
          ...options.sectionOptions,
        },
      ],
    });

    return doc;
  }
}
