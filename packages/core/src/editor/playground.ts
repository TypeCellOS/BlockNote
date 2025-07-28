import {
  audio,
  bulletListItem,
  checkListItem,
  heading,
  numberedListItem,
  pageBreak,
  paragraph,
  quoteBlock,
  toggleListItem,
  file,
  image,
  video,
} from "../blks/index.js";
import {
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks.js";
import { BlockDefinition } from "../schema/blocks/playground.js";
import {
  BlockSpecs,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  PropSchema,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
  createBlockSpec,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";

function removeUndefined<T extends Record<string, any> | undefined>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

const defaultBlockSpecs = {
  audio: audio.definition,
  bulletListItem: bulletListItem.definition,
  checkListItem: checkListItem.definition,
  heading: heading.definition,
  numberedListItem: numberedListItem.definition,
  pageBreak: pageBreak.definition,
  paragraph: paragraph.definition,
  quoteBlock: quoteBlock.definition,
  toggleListItem: toggleListItem.definition,
  file: file.definition,
  image: image.definition,
  video: video.definition,
};

export class BlockNoteSchema2<
  BSpecs extends Record<
    string,
    (options: TOptions) => BlockDefinition<string, PropSchema>
  >,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
  TOptions extends Partial<
    Record<keyof BlockSpecs, Record<string, any>>
  > = Record<string, never>,
> {
  private _blockSpecs: BSpecs;
  public get blockSpecs(): BlockSpecs {
    const obj = Object.fromEntries(
      Object.entries(this._blockSpecs).map(([key, value]) => {
        const blockDef = value(this.options);
        return [
          key,
          Object.assign(
            createBlockSpec(blockDef.config, blockDef.implementation as any),
            {
              extensions: blockDef.extensions,
            },
          ),
        ];
      }),
    ) as any;
    return obj;
  }
  public readonly inlineContentSpecs: InlineContentSpecs;
  public readonly styleSpecs: StyleSpecs;

  public get blockSchema(): Record<
    keyof BSpecs,
    ReturnType<BSpecs[keyof BSpecs]>
  > {
    const obj = Object.fromEntries(
      Object.entries(this._blockSpecs).map(([key, value]) => {
        const blockDef = value(this.options);
        return [key, blockDef.config];
      }),
    ) as any;
    return obj;
  }
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

  public readonly options: TOptions = {} as TOptions;

  public static create<
    BSpecs extends Record<
      string,
      (options: TOptions) => BlockDefinition<string, PropSchema>
    >,
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs,
    TOptions extends Partial<
      Record<keyof BlockSpecs, Record<string, any>>
    > = Record<string, never>,
  >(
    options?: {
      /**
       * A list of custom block types that should be available in the editor.
       */
      blockSpecs?: BSpecs;
      /**
       * A list of custom InlineContent types that should be available in the editor.
       */
      inlineContentSpecs?: ISpecs;
      /**
       * A list of custom Styles that should be available in the editor.
       */
      styleSpecs?: SSpecs;
    },
    configOptions?: TOptions,
  ) {
    return new BlockNoteSchema2<
      Record<
        keyof BSpecs,
        (options: TOptions) => BlockDefinition<string, PropSchema>
      >,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>,
      TOptions
    >(options as any, configOptions);
  }

  constructor(
    opts?: {
      blockSpecs?: BSpecs;
      inlineContentSpecs?: InlineContentSpecs;
      styleSpecs?: StyleSpecs;
    },
    configOptions?: TOptions,
  ) {
    this._blockSpecs = opts?.blockSpecs || (defaultBlockSpecs as any);
    this.inlineContentSpecs =
      removeUndefined(opts?.inlineContentSpecs) || defaultInlineContentSpecs;
    this.styleSpecs = removeUndefined(opts?.styleSpecs) || defaultStyleSpecs;

    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      this.inlineContentSpecs,
    ) as any;
    this.styleSchema = getStyleSchemaFromSpecs(this.styleSpecs) as any;
    this.options = configOptions || ({} as TOptions);
  }

  /**
   * This will add the options per block spec, allowing you to configure the block spec
   */
  public config<T extends Partial<Record<keyof BSpecs, Record<string, any>>>>(
    options: T,
  ): BlockNoteSchema2<BSpecs, ISchema, SSchema, TOptions & T> {
    // TODO should this be a deep merge?
    Object.assign(this.options, options);

    return this as any;
  }

  // public addBlockSpec<T extends BlockConfig>(
  //   blockConfig: T,
  //   blockImplementation: BlockImplementation<T>,
  // ):  {
  //   this.blockSpecs[blockConfig.type] = blockConfig;
  // }
}

// {
//   blockSpecs: {
//     // TODO figure out if this is better or worse, (what are the tradeoffs)
//     // this is simpler, but it's not as flexible
//     heading({levels:3}),
//   },
// }
// const schema = BlockNoteSchema.create().config({
//   heading: {
//     levels: [1, 2, 3],
//   },
// });
