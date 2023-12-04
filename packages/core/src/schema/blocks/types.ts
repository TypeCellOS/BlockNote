/** Define the main block types **/
import { Extension, Node } from "@tiptap/core";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
} from "../inlineContent/types";
import { PropSchema, Props } from "../propTypes";
import { StyleSchema } from "../styles/types";

export type BlockNoteDOMElement =
  | "editor"
  | "blockContainer"
  | "blockGroup"
  | "blockContent"
  | "inlineContent";

export type BlockNoteDOMAttributes = Partial<{
  [DOMElement in BlockNoteDOMElement]: Record<string, string>;
}>;

// BlockConfig contains the "schema" info about a Block type
// i.e. what props it supports, what content it supports, etc.
export type BlockConfig = {
  type: string;
  readonly propSchema: PropSchema;
  content: "inline" | "none" | "table";
};

// Block implementation contains the "implementation" info about a Block
// such as the functions / Nodes required to render and / or serialize it
export type TiptapBlockImplementation<
  T extends BlockConfig,
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  requiredExtensions?: Array<Extension | Node>;
  node: Node;
  toInternalHTML: (
    block: BlockFromConfigNoChildren<T, I, S> & {
      children: Block<B, I, S>[];
    },
    editor: BlockNoteEditor<B, I, S>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  toExternalHTML: (
    block: BlockFromConfigNoChildren<T, I, S> & {
      children: Block<B, I, S>[];
    },
    editor: BlockNoteEditor<B, I, S>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};

// A Spec contains both the Config and Implementation
export type BlockSpec<
  T extends BlockConfig,
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  config: T;
  implementation: TiptapBlockImplementation<T, B, I, S>;
};

// Utility type. For a given object block schema, ensures that the key of each
// block spec matches the name of the TipTap node in it.
type NamesMatch<Blocks extends Record<string, BlockConfig>> = Blocks extends {
  [Type in keyof Blocks]: Type extends string
    ? Blocks[Type] extends { type: Type }
      ? Blocks[Type]
      : never
    : never;
}
  ? Blocks
  : never;

// A Schema contains all the types (Configs) supported in an editor
// The keys are the "type" of a block
export type BlockSchema = NamesMatch<Record<string, BlockConfig>>;

export type BlockSpecs = Record<
  string,
  BlockSpec<any, any, InlineContentSchema, StyleSchema>
>;

export type BlockImplementations = Record<
  string,
  TiptapBlockImplementation<any, any, any, any>
>;

export type BlockSchemaFromSpecs<T extends BlockSpecs> = {
  [K in keyof T]: T[K]["config"];
};

export type BlockSchemaWithBlock<
  BType extends string,
  C extends BlockConfig
> = {
  [k in BType]: C;
};

export type TableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema
> = {
  type: "tableContent";
  rows: {
    cells: InlineContent<I, S>[][];
  }[];
};

// A BlockConfig has all the information to get the type of a Block (which is a specific instance of the BlockConfig.
// i.e.: paragraphConfig: BlockConfig defines what a "paragraph" is / supports, and BlockFromConfigNoChildren<paragraphConfig> is the shape of a specific paragraph block.
// (for internal use)
export type BlockFromConfigNoChildren<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  id: string;
  type: B["type"];
  props: Props<B["propSchema"]>;
  content: B["content"] extends "inline"
    ? InlineContent<I, S>[]
    : B["content"] extends "table"
    ? TableContent<I, S>
    : B["content"] extends "none"
    ? undefined
    : never;
};

export type BlockFromConfig<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = BlockFromConfigNoChildren<B, I, S> & {
  children: Block<BlockSchema, I, S>[];
};

// Converts each block spec into a Block object without children. We later merge
// them into a union type and add a children property to create the Block and
// PartialBlock objects we use in the external API.
type BlocksWithoutChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  [BType in keyof BSchema]: BlockFromConfigNoChildren<BSchema[BType], I, S>;
};

// Converts each block spec into a Block object without children, merges them
// into a union type, and adds a children property
export type Block<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = BlocksWithoutChildren<BSchema, I, S>[keyof BSchema] & {
  children: Block<BSchema, I, S>[];
};

export type SpecificBlock<
  BSchema extends BlockSchema,
  BType extends keyof BSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = BlocksWithoutChildren<BSchema, I, S>[BType] & {
  children: Block<BSchema, I, S>[];
};

/** CODE FOR PARTIAL BLOCKS, analogous to above
 *
 * Partial blocks are convenience-wrappers to make it easier to
 *create/update blocks in the editor.
 *
 */

export type PartialTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema
> = {
  type: "tableContent";
  rows: {
    cells: PartialInlineContent<I, S>[];
  }[];
};

type PartialBlockFromConfigNoChildren<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  id?: string;
  type?: B["type"];
  props?: Partial<Props<B["propSchema"]>>;
  content?: B["content"] extends "inline"
    ? PartialInlineContent<I, S>
    : B["content"] extends "table"
    ? PartialTableContent<I, S>
    : undefined;
};

type PartialBlocksWithoutChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  [BType in keyof BSchema]: PartialBlockFromConfigNoChildren<
    BSchema[BType],
    I,
    S
  >;
};

export type PartialBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = PartialBlocksWithoutChildren<
  BSchema,
  I,
  S
>[keyof PartialBlocksWithoutChildren<BSchema, I, S>] &
  Partial<{
    children: PartialBlock<BSchema, I, S>[];
  }>;

export type SpecificPartialBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  BType extends keyof BSchema,
  S extends StyleSchema
> = PartialBlocksWithoutChildren<BSchema, I, S>[BType] & {
  children?: Block<BSchema, I, S>[];
};

export type PartialBlockFromConfig<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = PartialBlockFromConfigNoChildren<B, I, S> & {
  children?: Block<BlockSchema, I, S>[];
};

export type BlockIdentifier = { id: string } | string;
