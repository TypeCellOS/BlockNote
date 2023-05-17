/** Define the main block types **/
import { Node, NodeConfig } from "@tiptap/core";
import { InlineContent, PartialInlineContent } from "./inlineContentTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

// A configuration for a TipTap node, but with stricter type constraints on the
// "name" and "group" properties. The "name" property is now always a string
// literal type, and the "blockGroup" property cannot be configured as it should
// always be "blockContent". Used as the parameter in `createTipTapNode`.
export type TipTapNodeConfig<
  Name extends string,
  Options = any,
  Storage = any
> = {
  [K in keyof NodeConfig<Options, Storage>]: K extends "name"
    ? Name
    : K extends "group"
    ? never
    : NodeConfig<Options, Storage>[K];
};

// A TipTap node with stricter type constraints on the "name" and "group"
// properties. The "name" property is now a string literal type, and the
// "blockGroup" property is now "blockContent". Returned by `createTipTapNode`.
export type TipTapNode<
  Name extends string,
  Options = any,
  Storage = any
> = Node<Options, Storage> & {
  name: Name;
  group: "blockContent";
};

// Defines a single prop spec, which includes the default value the prop should
// take and possible values it can take.
export type PropSpec = {
  values?: readonly string[];
  default: string;
};

// Defines multiple block prop specs. The key of each prop is the name of the
// prop, while the value is a corresponding prop spec. This should be included
// in a block config or schema. From a prop schema, we can derive both the props'
// internal implementation (as TipTap node attributes) and the type information
// for the external API.
export type PropSchema = Record<string, PropSpec>;

// Defines Props objects for use in Block objects in the external API. Converts
// each prop spec into a union type of its possible values, or a string if no
// values are specified.
export type Props<PSchema extends PropSchema> = {
  [PType in keyof PSchema]: PSchema[PType]["values"] extends readonly string[]
    ? PSchema[PType]["values"][number]
    : string;
};

// Defines the config for a single block. Meant to be used as an argument to
// `createBlockSpec`, which will create a new block spec from it. This is the
// main way we expect people to create custom blocks as consumers don't need to
// know anything about the TipTap API since the associated nodes are created
// automatically.
export type BlockConfig<
  Type extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
> = {
  // Attributes to define block in the API as well as a TipTap node.
  type: Type;
  readonly propSchema: PSchema;

  // Additional attributes to help define block as a TipTap node.
  containsInlineContent: ContainsInlineContent;
  parse?: (element: HTMLElement) => Props<PSchema>;
  render: (
    block: Block<BSchema>,
    editor: BlockNoteEditor<BSchema>
  ) => {
    dom: HTMLElement;
    contentDOM: ContainsInlineContent extends true ? HTMLElement : undefined;
  };
};

// Defines a single block spec, which includes the props that the block has and
// the TipTap node used to implement it. Can also be used to define more advanced
// custom blocks when used as an argument to `createBlockSpec` as consumers can
// create the associated nodes themselves.
export type BlockSpec<
  Type extends string,
  PSchema extends PropSchema,
  Options = any,
  Storage = any
> = {
  readonly propSchema: PSchema;
  node: TipTapNode<Type, Options, Storage>;
};

// Utility type. For a given object block schema, ensures that the key of each
// block spec matches the name of the TipTap node in it.
export type TypesMatch<
  Blocks extends Record<string, BlockSpec<string, PropSchema>>
> = Blocks extends {
  [Type in keyof Blocks]: Type extends string
    ? Blocks[Type] extends BlockSpec<Type, PropSchema>
      ? Blocks[Type]
      : never
    : never;
}
  ? Blocks
  : never;

// Defines multiple block specs. Also ensures that the key of each block schema
// is the same as name of the TipTap node in it. This should be passed in the
// `blocks` option of the BlockNoteEditor. From a block schema, we can derive
// both the blocks' internal implementation (as TipTap nodes) and the type
// information for the external API.
export type BlockSchema = TypesMatch<
  Record<string, BlockSpec<string, PropSchema>>
>;

// Converts each block spec into a Block object without children. We later merge
// them into a union type and add a children property to create the Block and
// PartialBlock objects we use in the external API.
type BlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: {
    id: string;
    type: BType;
    props: Props<BSchema[BType]["propSchema"]>;
    content: InlineContent[];
  };
};

// Converts each block spec into a Block object without children, merges them
// into a union type, and adds a children property
export type Block<BSchema extends BlockSchema> =
  BlocksWithoutChildren<BSchema>[keyof BlocksWithoutChildren<BSchema>] & {
    children: Block<BSchema>[];
  };

type PartialBlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: Partial<{
    id: string;
    type: BType;
    props: Partial<Props<BSchema[BType]["propSchema"]>>;
    content: PartialInlineContent[] | string;
  }>;
};

export type PartialBlock<BSchema extends BlockSchema> =
  PartialBlocksWithoutChildren<BSchema>[keyof PartialBlocksWithoutChildren<BSchema>] &
    Partial<{
      children: PartialBlock<BSchema>[];
    }>;

export type BlockIdentifier = { id: string } | string;
