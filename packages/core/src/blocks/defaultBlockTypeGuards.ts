import {
  BlockFromConfig,
  InlineContentSchema,
  PropSchema,
  PropSpec,
  StyleSchema,
} from "../schema";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor";
import { Block, defaultBlockSchema, DefaultBlockSchema } from "./defaultBlocks";
import { defaultProps } from "./defaultProps";

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

function propSpecsAreEqual(
  propSpec1: PropSpec<boolean | number | string>,
  propSpec2: PropSpec<boolean | number | string>
) {
  if (propSpec1.default !== propSpec2.default) {
    return false;
  }

  return propValuesAreEqual(propSpec1.values, propSpec2.values);
}

function propSchemasAreEqual(propSchema1: PropSchema, propSchema2: PropSchema) {
  const props1 = Object.keys(propSchema1);
  const props2 = Object.keys(propSchema2);

  if (props1.length !== props2.length) {
    return false;
  }

  for (const prop of props1) {
    if (!props2.includes(prop)) {
      return false;
    }

    if (propSpecsAreEqual(propSchema1[prop], propSchema2[prop])) {
      return false;
    }
  }

  return true;
}

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
    editor.blockSchema[blockType].type === defaultBlockSchema[blockType].type &&
    editor.blockSchema[blockType].content ===
      defaultBlockSchema[blockType].content &&
    propSchemasAreEqual(
      editor.blockSchema[blockType].propSchema,
      defaultBlockSchema[blockType].propSchema
    )
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
    propSpecsAreEqual(
      editor.blockSchema[blockType].propSchema[prop],
      defaultProps[prop]
    )
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
