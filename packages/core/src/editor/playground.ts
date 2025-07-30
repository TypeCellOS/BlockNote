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
import {
  createDependencyGraph,
  toposort,
  toposortReverse,
} from "../util/topo-sort.js";

function removeUndefined<T extends Record<string, any> | undefined>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

const defaultBlockSpecs = {
  paragraph: paragraph.definition,
  audio: audio.definition,
  bulletListItem: bulletListItem.definition,
  checkListItem: checkListItem.definition,
  heading: heading.definition,
  numberedListItem: numberedListItem.definition,
  pageBreak: pageBreak.definition,
  quoteBlock: quoteBlock.definition,
  toggleListItem: toggleListItem.definition,
  file: file.definition,
  image: image.definition,
  video: video.definition,
};

type DefaultBlockSpecs = {
  [key in keyof typeof defaultBlockSpecs]: ReturnType<
    (typeof defaultBlockSpecs)[key]
  >;
};

type BlockSpecMap<K extends string = string> = Record<
  K,
  BlockDefinition<K, PropSchema>
>;
export class BlockNoteSchema2<
  BSpecs extends BlockSpecMap,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
  TOptions extends Partial<
    Record<keyof BlockSpecs, Record<string, any>>
  > = Record<string, never>,
> {
  public readonly inlineContentSpecs: InlineContentSpecs;
  public readonly styleSpecs: StyleSpecs;
  public readonly blockSpecs: BlockSpecs;

  public readonly blockSchema: Record<keyof BSpecs, BSpecs[keyof BSpecs]>;
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

  public readonly options: TOptions = {} as TOptions;

  public static create<
    BSpecs extends BlockSpecMap,
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs,
  >(options?: {
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
  }) {
    return new BlockNoteSchema2<
      Record<keyof BSpecs, BlockDefinition<string, PropSchema>>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >(options as any);
  }

  constructor(opts?: {
    blockSpecs?: BSpecs;
    inlineContentSpecs?: InlineContentSpecs;
    styleSpecs?: StyleSpecs;
  }) {
    const specs: BSpecs =
      opts?.blockSpecs ||
      (Object.fromEntries(
        Object.entries(defaultBlockSpecs).map(([key, value]) => [
          key,
          value({} as never),
        ]),
      ) as any);
    const dag = createDependencyGraph();
    const defaultSet = new Set();
    dag.set("default", defaultSet);

    for (const [key, specDef] of Object.entries(specs)) {
      if (specDef.implementation.runsBefore) {
        dag.set(key, new Set(specDef.implementation.runsBefore));
      } else {
        defaultSet.add(key);
      }
    }
    console.log(dag);
    const sortedSpecs = toposortReverse(dag);
    console.log(sortedSpecs);
    const defaultIndex = sortedSpecs.findIndex((set) => set.has("default"));

    // the default index should map to 100
    // one before the default index is 90
    // one after is 110

    this.blockSpecs = Object.fromEntries(
      Object.entries(specs).map(
        ([key, blockDef]: [string, BlockDefinition<string, PropSchema>]) => {
          const index = sortedSpecs.findIndex((set) => set.has(key));
          const priority = 91 + (index + defaultIndex) * 10;
          console.log(key, index, priority, blockDef.extensions);
          return [
            key,
            Object.assign(
              {
                extensions: blockDef.extensions,
              },
              createBlockSpec(
                blockDef.config,
                blockDef.implementation as any,
                priority,
              ),
            ),
          ];
        },
      ),
    );
    console.log(this.blockSpecs);
    this.blockSchema = Object.fromEntries(
      Object.entries(this.blockSpecs).map(([key, blockDef]) => {
        return [key, blockDef.config];
      }),
    ) as any;
    this.inlineContentSpecs =
      removeUndefined(opts?.inlineContentSpecs) || defaultInlineContentSpecs;
    this.styleSpecs = removeUndefined(opts?.styleSpecs) || defaultStyleSpecs;

    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      this.inlineContentSpecs,
    ) as any;
    this.styleSchema = getStyleSchemaFromSpecs(this.styleSpecs) as any;
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
