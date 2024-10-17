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
  LineRuleType,
  Paragraph,
  ParagraphChild,
  Tab,
  TextRun,
  UnderlineType,
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
      blockMapping: BlockMapping<B, I, S, Paragraph, ParagraphChild[]>;
      inlineContentMapping: InlineContentMapping<I, S, ParagraphChild, TextRun>;
      styleMapping: StyleMapping<S, IRunPropertiesOptions>;
    }
  ) {}

  public transformStyledText(styledText: StyledText<S>) {
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

    return new TextRun({ ...styles, text: styledText.text });
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
      this.transformInlineContentArray.bind(this) as any, // not ideal as any
      nestingLevel
    );
  }

  public transformBlocks(blocks: Block<B, I, S>[]): Paragraph[] {
    return blocks.flatMap((b) => {
      let children = this.transformBlocks(b.children);
      children = children.map((c) => {
        c.addRunToFront(
          new TextRun({
            children: [new Tab()],
          })
        );
        return c;
      });
      const self = this.transformBlock(b as any, 0); // TODO: any

      return [self, ...children];
    });
  }

  public createDocumentProperties(): Partial<IPropertiesOptions> {
    return {
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Inter, SF Pro Display, BlinkMacSystemFont, Open Sans, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
              size: "14pt",
            },
            paragraph: {
              spacing: {
                line: 288,
                lineRule: LineRuleType.AUTO,

                // before: 2808,
                // after: 2808,
              },
            },
            // next: "Normal",
            // quickFormat: true,
            // run: {
            //   italics: true,
            //   color: "999999",
            // },
            // paragraph: {
            //   spacing: {
            //     line: 276,
            //   },
            //   indent: {
            //     left: 720,
            //   },
            // },
          },

          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 26,
              bold: true,
              color: "999999",
              underline: {
                type: UnderlineType.DOUBLE,
                color: "FF0000",
              },
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 26,
              bold: true,
              color: "999999",
              underline: {
                type: UnderlineType.DOUBLE,
                color: "FF0000",
              },
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
        ],
      },
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
    };
  }

  public toDocxJsDocument(blocks: Block<B, I, S>[]) {
    return new Document({
      ...this.createDocumentProperties(),
      sections: [
        {
          properties: {},
          children: this.transformBlocks(blocks),
        },
      ],
    });
  }
}
