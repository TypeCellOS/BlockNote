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
import { docxBlockMappingForDefaultSchema } from "./defaultSchema/blocks.js";
import {
  clampListLevel,
  DOCX_LIST_LEVEL_COUNT,
  listReference,
} from "./listLevels.js";
import {
  DOCXBlock,
  DOCXBlockResult,
  docxContent,
  isTabIndentedParagraph,
} from "./mapping.js";

// get constructor arg type from Document
type DocumentOptions = Partial<ConstructorParameters<typeof Document>[0]>;
type ListType = "bulletListItem" | "numberedListItem";
type ListDefinition = { type: ListType; levels: Map<number, ListType> };

const sharedNumberingMappings = new Set<object>([
  docxBlockMappingForDefaultSchema.bulletListItem,
  docxBlockMappingForDefaultSchema.numberedListItem,
]);

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
  DOCXBlockResult,
  ParagraphChild,
  IRunPropertiesOptions,
  TextRun
> {
  public constructor(
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    schema: BlockNoteSchema<B, I, S>,
    /**
     * The mappings that map the BlockNote schema to the docxjs content.
     * Pass {@link docxDefaultSchemaMappings} for the default schema.
     */
    protected readonly mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      DOCXBlockResult,
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
   * Collects numbering definitions for this transformation only. Overrides must
   * forward the collector so document options include the discovered levels.
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
   * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
   */
  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0,
    // Internal collector supplied by toDocxJsDocument for this export only.
    listDefinitions = new Map<number, ListDefinition>(),
  ): Promise<Array<Paragraph | Table>> {
    return docxContent(
      await this.transformBlockResults(blocks, nestingLevel, listDefinitions),
      "document",
    );
  }

  /**
   * Transforms sibling runs, sharing a built-in parent's numbering instance only
   * when the child level has a compatible marker. Gaps, type switches, custom
   * mappings, and clamped depths keep independent instances to preserve restarts.
   */
  private async transformBlockResults(
    blocks: Block<B, I, S>[],
    nestingLevel: number,
    listDefinitions: Map<number, ListDefinition>,
    parentInstance?: number,
  ): Promise<DOCXBlock[]> {
    const ret: DOCXBlock[] = [];

    // A run of sibling items continues its parent numbering at the next level.
    // OOXML fixes the marker type per level, so incompatible runs must instead
    // get their own definition. Breaks/type switches also need a fresh instance
    // to restart their counters without restarting the parent (#2225/#2227).
    let runListType: ListType | undefined;
    let runInstance = 0;

    for (const b of blocks) {
      let numberingInstance = 0;
      let sharesNumbering = false;
      if (b.type === "bulletListItem" || b.type === "numberedListItem") {
        // Generic block schemas do not narrow b.type to the literal union.
        const type: ListType =
          b.type === "bulletListItem" ? "bulletListItem" : "numberedListItem";
        // Only the built-in mappings guarantee use of listReference(instance).
        // Custom mappings can emit plain paragraphs or legacy references; an
        // equal instance argument alone does not make their counters restart.
        sharesNumbering = sharedNumberingMappings.has(
          this.mappings.blockMapping[type],
        );
        if (type !== runListType) {
          const level = clampListLevel(nestingLevel);
          const parent =
            parentInstance === undefined
              ? undefined
              : listDefinitions.get(parentInstance);
          const parentType = parent?.levels.get(level);
          if (
            parentInstance !== undefined &&
            sharesNumbering &&
            parent &&
            nestingLevel < DOCX_LIST_LEVEL_COUNT &&
            (parentType === undefined || parentType === type)
          ) {
            runInstance = parentInstance;
            parent.levels.set(level, type);
          } else {
            // Entries are never removed during an export, so the size gives
            // each independent list a fresh instance without shared state.
            runInstance = listDefinitions.size + 1;
            listDefinitions.set(runInstance, {
              type,
              levels: new Map([[level, type]]),
            });
          }
          parentInstance = undefined;
          runListType = type;
        }
        numberingInstance = runInstance;
      } else {
        runListType = undefined;
        parentInstance = undefined;
      }

      const children = await this.transformBlockResults(
        b.children,
        nestingLevel + 1,
        listDefinitions,
        sharesNumbering ? numberingInstance : undefined,
      );

      const placesChildren = this.placesChildren(b);
      if (!placesChildren) {
        for (const child of children) {
          // NOTE: nested tables not supported (we can't insert the new Tab before a table)
          if (isTabIndentedParagraph(child)) {
            child.addRunToFront(
              new TextRun({
                children: [new Tab()],
              }),
            );
          }
        }
      }

      // The `numberedListIndex` slot carries the numbering instance for the docx
      // block mappings (bullet/numbered list items); other block types ignore it.
      const self = await this.mapBlock(
        b,
        nestingLevel,
        numberingInstance,
        children,
      );
      const mapped = Array.isArray(self) ? self : [self];
      ret.push(...mapped);
      // A layout block's mapping is handed its children and places them itself,
      // so they must not be appended after it as well.
      if (!placesChildren) {
        ret.push(...children);
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

  /**
   * Builds styles and numbering from the completed transformation's collector.
   * Overrides must forward that collector; legacy list references remain
   * available for custom mappings alongside the generated mixed-list references.
   */
  protected async createDefaultDocumentOptions(
    locale?: string,
    listDefinitions = new Map<number, ListDefinition>(),
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
    /** Builds all supported levels, using the run's type for unused levels. */
    function listLevels(type: ListType, levels = new Map<number, ListType>()) {
      return Array.from({ length: DOCX_LIST_LEVEL_COUNT }, (_, i) => {
        const bullet = (levels.get(i) ?? type) === "bulletListItem";
        return {
          start: 1,
          level: i,
          format: bullet ? LevelFormat.BULLET : LevelFormat.DECIMAL,
          text: bullet ? bullets[i % bullets.length] : `%${i + 1}.`,
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: DEFAULT_TAB_STOP * (i + 1),
                hanging: DEFAULT_TAB_STOP,
              },
            },
          },
        };
      });
    }
    return {
      numbering: {
        config: [
          {
            reference: "blocknote-numbered-list",
            levels: listLevels("numberedListItem"),
          },
          {
            reference: "blocknote-bullet-list",
            levels: listLevels("bulletListItem"),
          },
          ...Array.from(listDefinitions, ([instance, definition]) => ({
            reference: listReference(instance),
            levels: listLevels(definition.type, definition.levels),
          })),
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
    // Discover each list's level formats before building the numbering config.
    // Keep this state local: the same exporter can build documents concurrently.
    const listDefinitions = new Map<number, ListDefinition>();
    const children = await this.transformBlocks(blocks, 0, listDefinitions);
    const doc = new Document({
      ...(await this.createDefaultDocumentOptions(
        options.locale,
        listDefinitions,
      )),
      ...options.documentOptions,
      sections: [
        {
          children,
          ...options.sectionOptions,
        },
      ],
    });

    return doc;
  }
}
