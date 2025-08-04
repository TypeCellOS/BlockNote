import {
  BlockDefinition,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  PropSchema,
  StyleSchema,
  StyleSpecs,
  createBlockSpec,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";
import { createDependencyGraph, toposortReverse } from "../util/topo-sort.js";

function removeUndefined<T extends Record<string, any> | undefined>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

export class CustomBlockNoteSchema<
  BSpecs extends {
    [key in string]: BlockDefinition<key, PropSchema>;
  },
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> {
  public readonly inlineContentSpecs: InlineContentSpecs;
  public readonly styleSpecs: StyleSpecs;
  public readonly blockSpecs: BlockSpecs;

  public readonly blockSchema: Record<keyof BSpecs, BSpecs[keyof BSpecs]>;
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

  constructor(opts: {
    blockSpecs: BSpecs;
    inlineContentSpecs: InlineContentSpecs;
    styleSpecs: StyleSpecs;
  }) {
    this.blockSpecs = this.initBlockSpecs(opts.blockSpecs);
    this.blockSchema = Object.fromEntries(
      Object.entries(this.blockSpecs).map(([key, blockDef]) => {
        return [key, blockDef.config];
      }),
    ) as any;
    this.inlineContentSpecs = removeUndefined(opts.inlineContentSpecs);
    this.styleSpecs = removeUndefined(opts.styleSpecs);

    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      this.inlineContentSpecs,
    ) as any;
    this.styleSchema = getStyleSchemaFromSpecs(this.styleSpecs) as any;
  }

  private initBlockSpecs(specs: BSpecs) {
    const dag = createDependencyGraph();
    const defaultSet = new Set<string>();
    dag.set("default", defaultSet);

    for (const [key, specDef] of Object.entries(specs)) {
      if (specDef.implementation.runsBefore) {
        dag.set(key, new Set(specDef.implementation.runsBefore));
      } else {
        defaultSet.add(key);
      }
    }
    const sortedSpecs = toposortReverse(dag);
    const defaultIndex = sortedSpecs.findIndex((set) => set.has("default"));

    /**
     * The priority of a block is described relative to the "default" block (an arbitrary block which can be used as the reference)
     *
     * Since blocks are topologically sorted, we can see what their relative position is to the "default" block
     * Each layer away from the default block is 10 priority points (arbitrarily chosen)
     * The default block is fixed at 101 (1 point higher than any tiptap extension, giving priority to custom blocks than any defaults)
     *
     * This is a bit of a hack, but it's a simple way to ensure that custom blocks are always rendered with higher priority than default blocks
     * and that custom blocks are rendered in the order they are defined in the schema
     */
    const getPriority = (key: string) => {
      const index = sortedSpecs.findIndex((set) => set.has(key));
      // the default index should map to 101
      // one before the default index is 91
      // one after is 111
      return 91 + (index + defaultIndex) * 10;
    };

    return Object.fromEntries(
      Object.entries(specs).map(
        ([key, blockDef]: [string, BlockDefinition<string, PropSchema>]) => {
          return [
            key,
            Object.assign(
              {
                extensions: blockDef.extensions,
              },
              createBlockSpec(
                blockDef.config,
                blockDef.implementation as any,
                getPriority(key),
              ),
            ),
          ];
        },
      ),
    );
  }
}
