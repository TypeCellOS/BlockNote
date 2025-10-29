import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { createDependencyGraph, toposortReverse } from "../util/topo-sort.js";
import {
  BlockNoDefaults,
  BlockSchema,
  BlockSpecs,
  InlineContentConfig,
  InlineContentSchema,
  InlineContentSpec,
  InlineContentSpecs,
  LooseBlockSpec,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSpecs,
  addNodeAndExtensionsToSpec,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "./index.js";

function removeUndefined<T extends Record<string, any> | undefined>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

export class CustomBlockNoteSchema<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> {
  // Helper so that you can use typeof schema.BlockNoteEditor
  public readonly BlockNoteEditor: BlockNoteEditor<BSchema, ISchema, SSchema> =
    "only for types" as any;

  public readonly Block: BlockNoDefaults<BSchema, ISchema, SSchema> =
    "only for types" as any;

  public readonly PartialBlock: PartialBlockNoDefaults<
    BSchema,
    ISchema,
    SSchema
  > = "only for types" as any;

  public inlineContentSpecs: InlineContentSpecs;
  public styleSpecs: StyleSpecs;
  public blockSpecs: {
    [K in keyof BSchema]: K extends string
      ? LooseBlockSpec<K, BSchema[K]["propSchema"], BSchema[K]["content"]>
      : never;
  };

  public blockSchema: BSchema;
  public inlineContentSchema: ISchema;
  public styleSchema: SSchema;

  constructor(
    private opts: {
      blockSpecs: BlockSpecs;
      inlineContentSpecs: InlineContentSpecs;
      styleSpecs: StyleSpecs;
    },
  ) {
    const {
      blockSpecs,
      inlineContentSpecs,
      styleSpecs,
      blockSchema,
      inlineContentSchema,
      styleSchema,
    } = this.init();
    this.blockSpecs = blockSpecs;
    this.styleSpecs = styleSpecs;
    this.styleSchema = styleSchema;
    this.inlineContentSpecs = inlineContentSpecs;
    this.blockSchema = blockSchema;
    this.inlineContentSchema = inlineContentSchema;
  }

  private init() {
    const dag = createDependencyGraph();
    const defaultSet = new Set<string>();
    dag.set("default", defaultSet);

    for (const [key, specDef] of Object.entries({
      ...this.opts.blockSpecs,
      ...this.opts.inlineContentSpecs,
      ...this.opts.styleSpecs,
    })) {
      if (specDef.implementation?.runsBefore) {
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

    const blockSpecs = Object.fromEntries(
      Object.entries(this.opts.blockSpecs).map(([key, blockSpec]) => {
        return [
          key,
          addNodeAndExtensionsToSpec(
            blockSpec.config,
            blockSpec.implementation,
            blockSpec.extensions,
            getPriority(key),
          ),
        ];
      }),
    ) as {
      [K in keyof BSchema]: K extends string
        ? LooseBlockSpec<K, BSchema[K]["propSchema"], BSchema[K]["content"]>
        : never;
    };

    const inlineContentSpecs = Object.fromEntries(
      Object.entries(this.opts.inlineContentSpecs).map(
        ([key, inlineContentSpec]) => {
          // Case for text and links.
          if (typeof inlineContentSpec.config !== "object") {
            return [key, inlineContentSpec];
          }

          return [
            key,
            {
              ...inlineContentSpec,
              implementation: {
                ...inlineContentSpec.implementation,
                node: inlineContentSpec.implementation?.node.extend({
                  priority: getPriority(key),
                }),
              },
            },
          ];
        },
      ),
    ) as InlineContentSpecs;

    const styleSpecs = Object.fromEntries(
      Object.entries(this.opts.styleSpecs).map(([key, styleSpec]) => [
        key,
        {
          ...styleSpec,
          implementation: {
            ...styleSpec.implementation,
            mark: styleSpec.implementation?.mark.extend({
              priority: getPriority(key),
            }),
          },
        },
      ]),
    ) as StyleSpecs;

    return {
      blockSpecs,
      blockSchema: Object.fromEntries(
        Object.entries(blockSpecs).map(([key, blockDef]) => {
          return [key, blockDef.config];
        }),
      ) as any,
      inlineContentSpecs: removeUndefined(inlineContentSpecs),
      styleSpecs: removeUndefined(styleSpecs),
      inlineContentSchema: getInlineContentSchemaFromSpecs(
        inlineContentSpecs,
      ) as any,
      styleSchema: getStyleSchemaFromSpecs(styleSpecs) as any,
    };
  }

  /**
   * Adds additional block specs to the current schema in a builder pattern.
   * This method allows extending the schema after it has been created.
   *
   * @param additionalBlockSpecs - Additional block specs to add to the schema
   * @returns The current schema instance for chaining
   */
  public extend<
    AdditionalBlockSpecs extends BlockSpecs = Record<string, never>,
    AdditionalInlineContentSpecs extends Record<
      string,
      InlineContentSpec<InlineContentConfig>
    > = Record<string, never>,
    AdditionalStyleSpecs extends StyleSpecs = Record<string, never>,
  >(opts: {
    blockSpecs?: AdditionalBlockSpecs;
    inlineContentSpecs?: AdditionalInlineContentSpecs;
    styleSpecs?: AdditionalStyleSpecs;
  }): CustomBlockNoteSchema<
    AdditionalBlockSpecs extends undefined | Record<string, never>
      ? BSchema
      : BSchema & {
          [K in keyof AdditionalBlockSpecs]: K extends string
            ? AdditionalBlockSpecs[K]["config"]
            : never;
        },
    AdditionalInlineContentSpecs extends undefined | Record<string, never>
      ? ISchema
      : ISchema & {
          [K in keyof AdditionalInlineContentSpecs]: AdditionalInlineContentSpecs[K]["config"];
        },
    AdditionalStyleSpecs extends undefined | Record<string, never>
      ? SSchema
      : SSchema & {
          [K in keyof AdditionalStyleSpecs]: AdditionalStyleSpecs[K]["config"];
        }
  > {
    // Merge the new specs with existing ones
    Object.assign(this.opts.blockSpecs, opts.blockSpecs);
    Object.assign(this.opts.inlineContentSpecs, opts.inlineContentSpecs);
    Object.assign(this.opts.styleSpecs, opts.styleSpecs);

    // Reinitialize the block specs with the merged specs
    const {
      blockSpecs,
      inlineContentSpecs,
      styleSpecs,
      blockSchema,
      inlineContentSchema,
      styleSchema,
    } = this.init();
    this.blockSpecs = blockSpecs;
    this.styleSpecs = styleSpecs;
    this.styleSchema = styleSchema;
    this.inlineContentSpecs = inlineContentSpecs;
    this.blockSchema = blockSchema;
    this.inlineContentSchema = inlineContentSchema;

    return this as any;
  }
}
