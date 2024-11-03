import { BlockNoteSchema } from "../editor/BlockNoteSchema.js";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import {
  BlockFromConfig,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  StyledText,
  Styles,
} from "../schema/index.js";

import type {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "./mapping.js";

export type ExporterOptions = {
  resolveFileUrl?: (url: string) => Promise<string | Blob>;
  colors: typeof COLORS_DEFAULT;
};
export abstract class Exporter<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
  RS,
  TS
> {
  public constructor(
    _schema: BlockNoteSchema<B, I, S>, // only used for type inference
    public readonly mappings: {
      blockMapping: BlockMapping<B, I, S, RB, RI>;
      inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
      styleMapping: StyleMapping<S, RS>;
    },
    public readonly options: ExporterOptions
  ) {}

  public async resolveFile(url: string) {
    if (!this.options?.resolveFileUrl) {
      return (await fetch(url)).blob();
    }
    const ret = await this.options.resolveFileUrl(url);
    if (ret instanceof Blob) {
      return ret;
    }
    return (await fetch(ret)).blob();
  }

  public mapStyles(styles: Styles<S>) {
    const stylesArray = Object.entries(styles).map(([key, value]) => {
      const mappedStyle = this.mappings.styleMapping[key](value, this);
      return mappedStyle;
    });
    return stylesArray;
  }

  public mapInlineContent(inlineContent: InlineContent<I, S>) {
    return this.mappings.inlineContentMapping[inlineContent.type](
      inlineContent,
      this
    );
  }

  public transformInlineContent(inlineContentArray: InlineContent<I, S>[]) {
    return inlineContentArray.map((ic) => this.mapInlineContent(ic));
  }

  public abstract transformStyledText(styledText: StyledText<S>): TS;

  public async mapBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number,
    numberedListIndex: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this,
      nestingLevel,
      numberedListIndex
    );
  }
}
