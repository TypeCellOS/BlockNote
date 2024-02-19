import {
  BlockSchema,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
} from "../schema";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor";
import { Block, defaultBlockSchema, DefaultBlockSchema } from "./defaultBlocks";

function propValuesAreEqual(
  propValues1: readonly (boolean | number | string)[] | undefined,
  propValues2: readonly (boolean | number | string)[] | undefined
) {
  if (propValues1 === undefined && propValues2 === undefined) {
    return true;
  }

  if (propValues1 === undefined || propValues2 === undefined) {
    return false;
  }

  if (propValues1.length !== propValues2.length) {
    return false;
  }

  for (const value of propValues1) {
    if (!propValues2.includes(value)) {
      return false;
    }
  }

  return true;
}

function propSchemaSameAsDefault(
  defaultBlockType: keyof DefaultBlockSchema,
  propSchema: PropSchema
) {
  const defaultProps = Object.keys(
    (defaultBlockSchema as BlockSchema)[defaultBlockType].propSchema
  );
  const props = Object.keys(propSchema);

  if (defaultProps.length > props.length) {
    return false;
  }

  for (const prop of defaultProps) {
    if (!props.includes(prop)) {
      return false;
    }

    const defaultPropSpec = (defaultBlockSchema as BlockSchema)[
      defaultBlockType
    ].propSchema[prop];
    const propSpec = propSchema[prop];

    if (defaultPropSpec.default !== propSpec.default) {
      return false;
    }

    if (!propValuesAreEqual(defaultPropSpec.values, propSpec.values)) {
      return false;
    }
  }

  return true;
}

export function checkDefaultBlockTypeInSchema<
  Type extends keyof DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockType: Type,
  editor: BlockNoteEditor<any, I, S>
): editor is BlockNoteEditor<{ Type: DefaultBlockSchema[Type] }, I, S> {
  return (
    blockType in editor.blockSchema &&
    editor.blockSchema[blockType].type === defaultBlockSchema[blockType].type &&
    editor.blockSchema[blockType].content ===
      defaultBlockSchema[blockType].content &&
    propSchemaSameAsDefault(blockType, defaultBlockSchema[blockType].propSchema)
  );
}

export function checkBlockIsDefaultType<
  Type extends keyof DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: Block<any, I, S>,
  editor: BlockNoteEditor<any, I, S>
): block is Block<{ Type: DefaultBlockSchema[Type] }, I, S> {
  return (
    block.type in editor.blockSchema &&
    checkDefaultBlockTypeInSchema(block.type, editor)
  );
}
