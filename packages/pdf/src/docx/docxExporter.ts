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
  AlignmentType,
  Document,
  IRunPropertiesOptions,
  LevelFormat,
  Packer,
  Paragraph,
  ParagraphChild,
  Tab,
  Table,
  TextRun,
} from "docx";

import {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "../mapping.js";
import { loadFileBuffer } from "../util/fileUtil.js";

const DEFAULT_TAB_STOP = 16 * 0.75 * 1.5 * 20; /* twip */
export class DOCXExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> {
  public constructor(
    public readonly schema: BlockNoteSchema<B, I, S>,
    public readonly mappings: {
      blockMapping: BlockMapping<
        B,
        I,
        S,
        | Promise<Paragraph[] | Paragraph | Table>
        | Paragraph[]
        | Paragraph
        | Table,
        (
          // Would be nicer if this was I and S, but that breaks
          inlineContentArray: InlineContent<InlineContentSchema, StyleSchema>[]
        ) => ParagraphChild[]
      >;
      inlineContentMapping: InlineContentMapping<
        I,
        S,
        ParagraphChild,
        (styledText: StyledText<S>, hyperlink?: boolean) => TextRun
      >;
      styleMapping: StyleMapping<S, IRunPropertiesOptions>;
    }
  ) {}

  public transformStyledText(styledText: StyledText<S>, hyperlink?: boolean) {
    const stylesArray = Object.entries(styledText.styles).map(
      ([key, value]) => {
        const mappedStyle = this.mappings.styleMapping[key](value);
        return mappedStyle;
      }
    );
    const styles: IRunPropertiesOptions = Object.assign(
      {} as IRunPropertiesOptions,
      ...stylesArray
    );

    return new TextRun({
      ...styles,
      style: hyperlink ? "Hyperlink" : undefined, // TODO: not working?
      text: styledText.text,
    });
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
    return inlineContentArray.map((ic) => this.transformInlineContent(ic));
  }

  public async transformBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this.transformInlineContentArray.bind(this) as any, // TODO: any
      nestingLevel
    );
  }

  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0
  ): Promise<Array<Paragraph | Table>> {
    const promises = await Promise.all(
      blocks.flatMap(async (b) => {
        let children = await this.transformBlocks(b.children, nestingLevel + 1);
        children = children.map((c, _i) => {
          // TODO: nested tables not supported
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
        const self = await this.transformBlock(b as any, nestingLevel); // TODO: any
        if (Array.isArray(self)) {
          return [...self, ...children];
        }
        return [self, ...children];
      })
    );
    return promises.flat();
  }

  public async getFonts(): Promise<
    ConstructorParameters<typeof Document>[0]["fonts"]
  > {
    // Unfortunately, loading the variable font doesn't work
    // "./src/fonts/Inter-VariableFont_opsz,wght.ttf",

    let font = await loadFileBuffer(
      await import("../fonts/inter/Inter_18pt-Regular.ttf")
    );

    if (font instanceof ArrayBuffer) {
      // conversionw with Polyfill needed because docxjs requires Buffer
      const Buffer = (await import("buffer")).Buffer;
      font = Buffer.from(font);
    }

    return [{ name: "Inter", data: font as Buffer }];
  }

  public async createDocumentProperties(): Promise<
    // get constructor arg type from Document
    Partial<ConstructorParameters<typeof Document>[0]>
  > {
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

  public async toBlob(blocks: Block<B, I, S>[]) {
    const doc = await this.toDocxJsDocument(blocks);
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

  public async toDocxJsDocument(blocks: Block<B, I, S>[]) {
    const doc = new Document({
      ...(await this.createDocumentProperties()),
      sections: [
        {
          properties: {},
          children: await this.transformBlocks(blocks),
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
