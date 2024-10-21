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
  Paragraph,
  ParagraphChild,
  Tab,
  Table,
  TextRun,
} from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "../mapping.js";

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
        Paragraph | Table,
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

  public transformBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this.transformInlineContentArray.bind(this) as any, // TODO: any
      nestingLevel
    );
  }

  public transformBlocks(blocks: Block<B, I, S>[]): Array<Paragraph | Table> {
    return blocks.flatMap((b) => {
      let children = this.transformBlocks(b.children);
      children = children.map((c) => {
        // TODO: nested tables not supported
        if (c instanceof Paragraph) {
          c.addRunToFront(
            new TextRun({
              children: [new Tab()],
            })
          );
        }
        return c;
      });
      const self = this.transformBlock(b as any, 0); // TODO: any

      return [self, ...children];
    });
  }

  public async createDocumentProperties(): Promise<
    Partial<IPropertiesOptions>
  > {
    // const externalStyles = await loadFilePlainText(
    //   // @ts-ignore
    //   await import("./template/word/styles.xml?raw")
    // );

    const externalStyles = (await import("./template/word/styles.xml?raw"))
      .default;

    return {
      numbering: {
        config: [
          {
            reference: "blocknote-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1",
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
      // TODO: issue with docx
      // fonts: [
      //   {
      //     name: "Inter",
      //     data: fs.readFileSync("./src/fonts/Inter-VariableFont_opsz,wght.ttf"),
      //   },
      // ],
      externalStyles,
    };
  }

  public async toDocxJsDocument(blocks: Block<B, I, S>[]) {
    return new Document({
      ...(await this.createDocumentProperties()),
      sections: [
        {
          properties: {},
          children: this.transformBlocks(blocks),
        },
      ],
    });
  }
}
