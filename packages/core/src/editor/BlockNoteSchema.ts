import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks.js";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
} from "../schema/index.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

import { BlockSpecOf, CustomBlockNoteSchema } from "./CustomSchema.js";

export class BlockNoteSchema<
  BSpecs extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> extends CustomBlockNoteSchema<BSpecs, ISchema, SSchema> {
  // Helper so that you can use typeof schema.BlockNoteEditor
  public readonly BlockNoteEditor: BlockNoteEditor<any, ISchema, SSchema> =
    "only for types" as any;

  public readonly Block: BlockNoDefaults<any, ISchema, SSchema> =
    "only for types" as any;

  public readonly PartialBlock: PartialBlockNoDefaults<
    any,
    // BSchema,
    ISchema,
    SSchema
  > = "only for types" as any;

  public static create<
    BSpecs extends BlockSchema = {
      [key in keyof typeof defaultBlockSpecs]: (typeof defaultBlockSpecs)[key]["config"];
    },
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs,
  >(options?: {
    /**
     * A list of custom block types that should be available in the editor.
     */
    blockSpecs?: BlockSpecOf<BSpecs>;
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
      BSpecs,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >({
      blockSpecs: options?.blockSpecs ?? (defaultBlockSpecs as any),
      inlineContentSpecs:
        options?.inlineContentSpecs ?? defaultInlineContentSpecs,
      styleSpecs: options?.styleSpecs ?? defaultStyleSpecs,
    });
  }
}
