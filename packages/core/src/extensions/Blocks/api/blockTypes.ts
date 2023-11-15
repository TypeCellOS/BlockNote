/** Define the main block types **/
import { Node } from "@tiptap/core";
import { BlockNoteEditor } from "../../..";
import { DefaultBlockSchema } from "./defaultBlocks";
import { InlineContent, PartialInlineContent } from "./inlineContentTypes";

export type BlockNoteDOMElement =
  | "editor"
  | "blockContainer"
  | "blockGroup"
  | "blockContent"
  | "inlineContent";

export type BlockNoteDOMAttributes = Partial<{
  [DOMElement in BlockNoteDOMElement]: Record<string, string>;
}>;

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

// BlockConfig contains the "schema" info about a Block
export type BlockConfig = {
  type: string;
  readonly propSchema: PropSchema;
  content: "inline" | "none"; // | "table"
};

// Block implementation contains the "implementation" info about a Block
// such as the functions / Nodes required to render and / or serialize it
export type BlockImplementation<T extends BlockConfig> = {
  requiredNodes?: Node[];
  node: Node;
  toInternalHTML: (
    block: Block<T>,
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T["propSchema"]>>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  toExternalHTML: (
    block: Block<T>,
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T["propSchema"]>>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};

// Container for both the config and implementation of a block,
// and the type of BlockImplementation is based on that of the config
export type BlockSpec<T extends BlockConfig> = {
  config: T;
  implementation: BlockImplementation<T>;
};

// Utility type. For a given object block schema, ensures that the key of each
// block spec matches the name of the TipTap node in it.
type NamesMatch<Blocks extends Record<string, BlockSpec<any>>> =
  Blocks extends {
    [Type in keyof Blocks]: Type extends string
      ? Blocks[Type]["config"] extends { type: Type }
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
export type BlockSchema = NamesMatch<Record<string, BlockSpec<any>>>;

export type BlockSchemaWithBlock<
  BType extends string,
  PSchema extends PropSchema
> = BlockSchema & {
  [k in BType]: BlockConfig & {
    propSchema: PSchema;
  };
};

// A BlockConfig has all the information to get the type of a Block (which is a specific instance of the BlockConfig.
// i.e.: paragraphConfig: BlockConfig defines what a "paragraph" is / supports, and BlockFromBlockConfig<paragraphConfig> is the shape of a specific paragraph block.
// (for internal use)
type BlockFromBlockConfig<B extends BlockConfig> = {
  id: string;
  type: B["type"];
  props: Props<B["propSchema"]>;
  content: B["content"] extends "inline"
    ? InlineContent[]
    : // : B["content"] extends "table"
      // ? InlineContent[][]
      undefined;
};

// Converts each block spec into a Block object without children. We later merge
// them into a union type and add a children property to create the Block and
// PartialBlock objects we use in the external API.
type BlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: BlockFromBlockConfig<BSchema[BType]["config"]>;
};

// Converts each block spec into a Block object without children, merges them
// into a union type, and adds a children property
export type Block<T extends BlockSchema | BlockConfig = DefaultBlockSchema> =
  (T extends BlockSchema
    ? BlocksWithoutChildren<T>[keyof T]
    : T extends BlockConfig
    ? BlockFromBlockConfig<T>
    : never) & {
    children: Block<
      T extends BlockSchema ? T : any // any should probably be BlockSchemaWithBlock<B["type"], B["propSchema"]>;
    >[];
  };

export type SpecificBlock<
  BSchema extends BlockSchema,
  BType extends keyof BSchema
> = BlocksWithoutChildren<BSchema>[BType] & {
  children: Block<BSchema>[];
};

/** CODE FOR PARTIAL BLOCKS, analogous to above */

type PartialBlockFromBlockConfig<B extends BlockConfig> = {
  id?: string;
  type?: B["type"];
  props?: Partial<Props<B["propSchema"]>>;
  content?: B["content"] extends "inline"
    ? PartialInlineContent[] | string
    : // : B["content"] extends "table"
      // ? PartialInlineContent[][]
      undefined;
};

// Same as BlockWithoutChildren, but as a partial type with some changes to make
// it easier to create/update blocks in the editor.
type PartialBlocksWithoutChildren<BSchema extends BlockSchema> = {
  [BType in keyof BSchema]: PartialBlockFromBlockConfig<
    BSchema[BType]["config"]
  >;
};

// Same as Block, but as a partial type with some changes to make it easier to
// create/update blocks in the editor.
export type PartialBlock<BSchema extends BlockSchema = DefaultBlockSchema> =
  PartialBlocksWithoutChildren<BSchema>[keyof PartialBlocksWithoutChildren<BSchema>] &
    Partial<{
      children: PartialBlock<BSchema>[];
    }>;

export type SpecificPartialBlock<
  BSchema extends BlockSchema,
  BType extends keyof BSchema
> = PartialBlocksWithoutChildren<BSchema>[BType] & {
  children?: Block<BSchema>[];
};

export type BlockIdentifier = { id: string } | string;
