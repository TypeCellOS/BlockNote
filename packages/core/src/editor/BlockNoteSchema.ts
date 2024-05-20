import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks";
import {
  BlockSchema,
  BlockSchemaFromSpecs,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
  getBlockSchemaFromSpecs,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema";
import type {
  BlockNoDefaults,
  PartialBlockNoDefaults,
} from "../schema/blocks/types";
import type { BlockNoteEditor } from "./BlockNoteEditor";

function removeUndefined<T extends Record<string, any> | undefined>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

export class BlockNoteSchema<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> {
  public readonly blockSpecs: BlockSpecs;
  public readonly inlineContentSpecs: InlineContentSpecs;
  public readonly styleSpecs: StyleSpecs;

  public readonly blockSchema: BSchema;
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

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

  public static create<
    BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs
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
    return new BlockNoteSchema<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >(options);
    // as BlockNoteSchema<
    // BlockSchemaFromSpecs<BSpecs>,
    // InlineContentSchemaFromSpecs<ISpecs>,
    // StyleSchemaFromSpecs<SSpecs>
    // >;
  }

  constructor(opts?: {
    blockSpecs?: BlockSpecs;
    inlineContentSpecs?: InlineContentSpecs;
    styleSpecs?: StyleSpecs;
  }) {
    this.blockSpecs = removeUndefined(opts?.blockSpecs) || defaultBlockSpecs;
    this.inlineContentSpecs =
      removeUndefined(opts?.inlineContentSpecs) || defaultInlineContentSpecs;
    this.styleSpecs = removeUndefined(opts?.styleSpecs) || defaultStyleSpecs;

    this.blockSchema = getBlockSchemaFromSpecs(this.blockSpecs) as any;
    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      this.inlineContentSpecs
    ) as any;
    this.styleSchema = getStyleSchemaFromSpecs(this.styleSpecs) as any;
  }
}
