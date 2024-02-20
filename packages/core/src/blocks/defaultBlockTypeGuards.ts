import { BlockFromConfig, InlineContentSchema, StyleSchema } from "../schema";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor";
import { Block, defaultBlockSchema, DefaultBlockSchema } from "./defaultBlocks";
import { defaultProps } from "./defaultProps";

export function checkDefaultBlockTypeInSchema<
  BlockType extends keyof DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockType: BlockType,
  editor: BlockNoteEditor<any, I, S>
): editor is BlockNoteEditor<{ Type: DefaultBlockSchema[BlockType] }, I, S> {
  return (
    blockType in editor.blockSchema &&
    editor.blockSchema[blockType] === defaultBlockSchema[blockType]
  );
}

export function checkBlockIsDefaultType<
  BlockType extends keyof DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockType: BlockType,
  block: Block<any, I, S>,
  editor: BlockNoteEditor<any, I, S>
): block is BlockFromConfig<DefaultBlockSchema[BlockType], I, S> {
  return (
    block.type === blockType &&
    block.type in editor.blockSchema &&
    checkDefaultBlockTypeInSchema(block.type, editor)
  );
}

export function checkBlockTypeHasDefaultProp<
  Prop extends keyof typeof defaultProps,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  prop: Prop,
  blockType: string,
  editor: BlockNoteEditor<any, I, S>
): editor is BlockNoteEditor<
  {
    [BT in string]: {
      type: BT;
      propSchema: {
        [P in Prop]: (typeof defaultProps)[P];
      };
      content: "table" | "inline" | "none";
    };
  },
  I,
  S
> {
  return (
    blockType in editor.blockSchema &&
    prop in editor.blockSchema[blockType].propSchema &&
    editor.blockSchema[blockType].propSchema[prop] === defaultProps[prop]
  );
}

export function checkBlockHasDefaultProp<
  Prop extends keyof typeof defaultProps,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  prop: Prop,
  block: Block<any, I, S>,
  editor: BlockNoteEditor<any, I, S>
): block is BlockFromConfig<
  {
    type: string;
    propSchema: {
      [P in Prop]: (typeof defaultProps)[P];
    };
    content: "table" | "inline" | "none";
  },
  I,
  S
> {
  return checkBlockTypeHasDefaultProp(prop, block.type, editor);
}
