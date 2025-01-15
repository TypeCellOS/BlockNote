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
  I extends InlineContentSchema
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
    options?: Partial<ExporterOptions>
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
      ...stylesArray
    );

    return new TextRun({
      ...styles,
      style: hyperlink ? "Hyperlink" : undefined,
      text: styledText.text,
    });
  }

  /**
   * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
   */
  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0
  ): Promise<Array<Paragraph | Table>> {
    const ret: Array<Paragraph | Table> = [];

    for (const b of blocks) {
      let children = await this.transformBlocks(b.children, nestingLevel + 1);
      children = children.map((c, _i) => {
        // NOTE: nested tables not supported (we can't insert the new Tab before a table)
        if (
          c instanceof Paragraph &&
          !(c as any).properties.numberingReferences.length
        ) {
          c.addRunToFront(
            new TextRun({
              children: [new Tab()],
            })
          );
        }
        return c;
      });
      const self = await this.mapBlock(b as any, nestingLevel, 0 /*unused*/); // TODO: any
      if (Array.isArray(self)) {
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

    let interFont = await loadFileBuffer(
      await import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf")
    );
    let geistMonoFont = await loadFileBuffer(
      await import("@shared/assets/fonts/GeistMono-Regular.ttf")
    );

    if (
      interFont instanceof ArrayBuffer ||
      geistMonoFont instanceof Uint8Array
    ) {
      // conversion with Polyfill needed because docxjs requires Buffer
      const Buffer = (await import("buffer")).Buffer;

      if (interFont instanceof ArrayBuffer) {
        interFont = Buffer.from(interFont);
      }
      if (geistMonoFont instanceof ArrayBuffer) {
        geistMonoFont = Buffer.from(geistMonoFont);
      }
    }

    return [
      { name: "Inter", data: interFont as Buffer },
      {
        name: "GeistMono",
        data: geistMonoFont as Buffer,
      },
    ];
  }

  protected async createDefaultDocumentOptions(): Promise<DocumentOptions> {
    const externalStyles = (await import("./template/word/styles.xml?raw"))
      .default;

    const bullets = ["•"]; //, "◦", "▪"]; (these don't look great, just use solid bullet for now)
    return {
      numbering: {
        config: [
          {
            reference: "blocknote-numbered-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
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
            levels: Array.from({ length: 9 }, (_, i) => ({
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
   * Convert a document (array of Blocks to a Blob representing a .docx file)
   */
  public async toBlob(
    blocks: Block<B, I, S>[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
    } = {
      sectionOptions: {},
      documentOptions: {},
    }
  ) {
    const doc = await this.toDocxJsDocument(blocks, options);
    const prevBuffer = globalThis.Buffer;
    try {
      if (!globalThis.Buffer) {
        // load Buffer polyfill because docxjs requires this
        globalThis.Buffer = (await import("buffer")).Buffer;
      }
      return Packer.toBlob(doc);
    } finally {
      globalThis.Buffer = prevBuffer;
    }
  }

  /**
   * Convert a document (array of Blocks to a docxjs Document)
   */
  public async toDocxJsDocument(
    blocks: Block<B, I, S>[],
    options: {
      sectionOptions: Omit<ISectionOptions, "children">;
      documentOptions: DocumentOptions;
    } = {
      sectionOptions: {},
      documentOptions: {},
    }
  ) {
    const doc = new Document({
      ...(await this.createDefaultDocumentOptions()),
      ...options.documentOptions,
      sections: [
        {
          children: await this.transformBlocks(blocks),
          ...options.sectionOptions,
        },
      ],
    });

    // fix https://github.com/dolanmiu/docx/pull/2800/files
    doc.Document.Relationships.createRelationship(
      doc.Document.Relationships.RelationshipCount + 1,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
      "fontTable.xml"
    );

    return doc;
  }
}
