/** Define the main block types **/
import { Node, NodeConfig } from "@tiptap/core";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { InlineContent, PartialInlineContent } from "./inlineContentTypes";
import { DefaultBlockSchema } from "./defaultBlocks";

export type BlockNoteDOMElement =
  | "editor"
  | "blockContainer"
  | "blockGroup"
  | "blockContent"
  | "inlineContent";

export type BlockNoteDOMAttributes = Partial<{
  [DOMElement in BlockNoteDOMElement]: Record<string, string>;
}>;

// A configuration for a TipTap node, but with stricter type constraints on the
// "name" and "content" properties. The "name" property is now always a string
// literal type, and the "content" property can only be "inline*" or "". Used as
// the parameter in `createTipTapNode`. The "group" is also removed as
// `createTipTapNode` always sets it to "blockContent"
export type TipTapNodeConfig<
  Name extends string,
  ContainsInlineContent extends boolean,
  Options extends {
    domAttributes?: BlockNoteDOMAttributes;
  } = {
    domAttributes?: BlockNoteDOMAttributes;
  },
  Storage = any
> = {
  [K in keyof NodeConfig<Options, Storage>]: K extends "name"
    ? Name
    : K extends "content"
    ? ContainsInlineContent extends true
      ? "inline*"
      : ""
    : K extends "group"
    ? never
    : NodeConfig<Options, Storage>[K];
} & {
  name: Name;
  content: ContainsInlineContent extends true ? "inline*" : "";
};

// A TipTap node with stricter type constraints on the "name", "group", and
// "content properties. The "name" property is now a string literal type, and
// the "blockGroup" property is now "blockContent", and the "content" property
// can only be "inline*" or "". Returned by `createTipTapNode`.
export type TipTapNode<
  Name extends string,
  ContainsInlineContent extends boolean,
  Options extends {
    domAttributes?: BlockNoteDOMAttributes;
  } = {
    domAttributes?: BlockNoteDOMAttributes;
  },
  Storage = any
> = {
  [Key in keyof Node<Options, Storage>]: Key extends "name"
    ? Name
    : Key extends "config"
    ? {
        [ConfigKey in keyof Node<
          Options,
          Storage
        >["config"]]: ConfigKey extends "group"
          ? "blockContent"
          : ConfigKey extends "content"
          ? ContainsInlineContent extends true
            ? "inline*"
            : ""
          : NodeConfig<Options, Storage>["config"][ConfigKey];
      } & {
        group: "blockContent";
        content: ContainsInlineContent extends true ? "inline*" : "";
      }
    : Node<Options, Storage>["config"][Key];
};

// Defines a single prop spec, which includes the default value the prop should
// take and possible values it can take.
export type PropSpec<PType extends boolean | number | string> = {
  values?: readonly PType[];
  default: PType;
};

// Defines multiple block prop specs. The key of each prop is the name of the
// prop, while the value is a corresponding prop spec. This should be included
// in a block config or schema. From a prop schema, we can derive both the props'
// internal implementation (as TipTap node attributes) and the type information
// for the external API.
export type PropSchema = Record<string, PropSpec<boolean | number | string>>;

// Defines Props objects for use in Block objects in the external API. Converts
// each prop spec into a union type of its possible values, or a string if no
// values are specified.
export type Props<PSchema extends PropSchema> = {
  [PName in keyof PSchema]: PSchema[PName]["default"] extends boolean
    ? PSchema[PName]["values"] extends readonly boolean[]
      ? PSchema[PName]["values"][number]
      : boolean
    : PSchema[PName]["default"] extends number
    ? PSchema[PName]["values"] extends readonly number[]
      ? PSchema[PName]["values"][number]
      : number
    : PSchema[PName]["default"] extends string
    ? PSchema[PName]["values"] extends readonly string[]
      ? PSchema[PName]["values"][number]
      : string
    : never;
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
  render: (
    /**
     * The custom block to render
     */
    block: SpecificBlock<
      BSchema & {
        [k in Type]: BlockSpec<Type, PSchema, ContainsInlineContent>;
      },
      Type
    >,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<
      BSchema & { [k in Type]: BlockSpec<Type, PSchema, ContainsInlineContent> }
    >
    // (note) if we want to fix the manual cast, we need to prevent circular references and separate block definition and render implementations
    // or allow manually passing <BSchema>, but that's not possible without passing the other generics because Typescript doesn't support partial inferred generics
  ) => ContainsInlineContent extends true
    ? {
        dom: HTMLElement;
        contentDOM: HTMLElement;
        destroy?: () => void;
      }
    : {
        dom: HTMLElement;
        destroy?: () => void;
      };
};

// Defines a single block spec, which includes the props that the block has and
// the TipTap node used to implement it. Usually created using `createBlockSpec`
// though it can also be defined from scratch by providing your own TipTap node,
// allowing for more advanced custom blocks.
export type BlockSpec<
  Type extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean
> = {
  node: TipTapNode<Type, ContainsInlineContent, any>;
  readonly propSchema: PSchema;
};

// Utility type. For a given object block schema, ensures that the key of each
// block spec matches the name of the TipTap node in it.
type NamesMatch<
  Blocks extends Record<string, BlockSpec<string, PropSchema, boolean>>
> = Blocks extends {
  [Type in keyof Blocks]: Type extends string
    ? Blocks[Type] extends BlockSpec<Type, PropSchema, boolean>
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
export type BlockSchema = NamesMatch<
  Record<string, BlockSpec<string, PropSchema, boolean>>
>;

// Converts each block spec into a Block object without children. We later merge
// them into a union type and add a children property to create the Block and
// PartialBlock objects we use in the external API.
type BlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: {
    id: string;
    type: BType;
    props: Props<BSchema[BType]["propSchema"]>;
    content: BSchema[BType]["node"]["config"]["content"] extends "inline*"
      ? InlineContent[]
      : undefined;
  };
};

// Converts each block spec into a Block object without children, merges them
// into a union type, and adds a children property
export type Block<BSchema extends BlockSchema = DefaultBlockSchema> =
  BlocksWithoutChildren<BSchema>[keyof BlocksWithoutChildren<BSchema>] & {
    children: Block<BSchema>[];
  };

export type SpecificBlock<
  BSchema extends BlockSchema,
  BlockType extends keyof BSchema
> = BlocksWithoutChildren<BSchema>[BlockType] & {
  children: Block<BSchema>[];
};

// Same as BlockWithoutChildren, but as a partial type with some changes to make
// it easier to create/update blocks in the editor.
type PartialBlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: Partial<{
    id: string;
    type: BType;
    props: Partial<Props<BSchema[BType]["propSchema"]>>;
    content: BSchema[BType]["node"]["config"]["content"] extends "inline*"
      ? PartialInlineContent[] | string
      : undefined;
  }>;
};

// Same as Block, but as a partial type with some changes to make it easier to
// create/update blocks in the editor.
export type PartialBlock<BSchema extends BlockSchema = DefaultBlockSchema> =
  PartialBlocksWithoutChildren<BSchema>[keyof PartialBlocksWithoutChildren<BSchema>] &
    Partial<{
      children: PartialBlock<BSchema>[];
    }>;

export type BlockIdentifier = { id: string } | string;
