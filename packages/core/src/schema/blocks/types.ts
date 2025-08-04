/** Define the main block types **/
import type { Extension, Node } from "@tiptap/core";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
} from "../inlineContent/types.js";
import type { PropSchema, Props } from "../propTypes.js";
import type { StyleSchema } from "../styles/types.js";
import type { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import type { Fragment, Schema } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";

export type BlockNoteDOMElement =
  | "editor"
  | "block"
  | "blockGroup"
  | "blockContent"
  | "inlineContent";

export type BlockNoteDOMAttributes = Partial<{
  [DOMElement in BlockNoteDOMElement]: Record<string, string>;
}>;

export interface BlockConfigMeta {
  /**
   * Whether the block is selectable
   */
  selectable?: boolean;

  /**
   * The accept mime types for the file block
   */
  fileBlockAccept?: string[];

  /**
   * Whether the block is a {@link https://prosemirror.net/docs/ref/#model.NodeSpec.code} block
   */
  code?: boolean;

  /**
   * Whether the block is a {@link https://prosemirror.net/docs/ref/#model.NodeSpec.defining} block
   */
  defining?: boolean;
}

/**
 * BlockConfig contains the "schema" info about a Block type
 * i.e. what props it supports, what content it supports, etc.
 */
export interface BlockConfig<
  TName extends string = string,
  TSchema extends PropSchema = PropSchema,
> {
  /**
   * The type of the block (unique identifier within a schema)
   */
  type: TName;
  /**
   * The properties that the block supports
   * @todo will be zod schema in the future
   */
  readonly propSchema: TSchema;
  /**
   * The content that the block supports
   */
  content: "inline" | "none";
  // TODO: how do you represent things that have nested content?
  // e.g. tables, alerts (with title & content)
  /**
   * Metadata
   */
  meta?: BlockConfigMeta;
}

// Block implementation contains the "implementation" info about a Block
// such as the functions / Nodes required to render and / or serialize it
export type TiptapBlockImplementation<
  T extends BlockConfig,
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  requiredExtensions?: Array<Extension | Node>;
  node: Node;
  toInternalHTML: (
    block: BlockFromConfigNoChildren<T, I, S> & {
      children: BlockNoDefaults<B, I, S>[];
    },
    editor: BlockNoteEditor<B, I, S>,
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  toExternalHTML: (
    block: BlockFromConfigNoChildren<T, I, S> & {
      children: BlockNoDefaults<B, I, S>[];
    },
    editor: BlockNoteEditor<B, I, S>,
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
  S extends StyleSchema,
> = {
  config: T;
  implementation: TiptapBlockImplementation<NoInfer<T>, B, I, S>;
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
  C extends BlockConfig,
> = {
  [k in BType]: C;
};

export type TableCellProps = {
  backgroundColor: string;
  textColor: string;
  textAlignment: "left" | "center" | "right" | "justify";
  colspan?: number;
  rowspan?: number;
};

export type TableCell<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableCell";
  props: TableCellProps;
  content: InlineContent<I, S>[];
};

export type TableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableContent";
  columnWidths: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: {
    cells: InlineContent<I, S>[][] | TableCell<I, S>[];
  }[];
};

// A BlockConfig has all the information to get the type of a Block (which is a specific instance of the BlockConfig.
// i.e.: paragraphConfig: BlockConfig defines what a "paragraph" is / supports, and BlockFromConfigNoChildren<paragraphConfig> is the shape of a specific paragraph block.
// (for internal use)
export type BlockFromConfigNoChildren<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema,
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
  S extends StyleSchema,
> = BlockFromConfigNoChildren<B, I, S> & {
  children: BlockNoDefaults<BlockSchema, I, S>[];
};

// Converts each block spec into a Block object without children. We later merge
// them into a union type and add a children property to create the Block and
// PartialBlock objects we use in the external API.
type BlocksWithoutChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  [BType in keyof BSchema]: BlockFromConfigNoChildren<BSchema[BType], I, S>;
};

// Converts each block spec into a Block object without children, merges them
// into a union type, and adds a children property
export type BlockNoDefaults<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = BlocksWithoutChildren<BSchema, I, S>[keyof BSchema] & {
  children: BlockNoDefaults<BSchema, I, S>[];
};

export type SpecificBlock<
  BSchema extends BlockSchema,
  BType extends keyof BSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = BlocksWithoutChildren<BSchema, I, S>[BType] & {
  children: BlockNoDefaults<BSchema, I, S>[];
};

/** CODE FOR PARTIAL BLOCKS, analogous to above
 *
 * Partial blocks are convenience-wrappers to make it easier to
 *create/update blocks in the editor.
 *
 */

export type PartialTableCell<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableCell";
  props?: Partial<TableCellProps>;
  content?: PartialInlineContent<I, S>;
};

export type PartialTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableContent";
  columnWidths?: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: {
    cells: PartialInlineContent<I, S>[] | PartialTableCell<I, S>[];
  }[];
};

type PartialBlockFromConfigNoChildren<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema,
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
  S extends StyleSchema,
> = {
  [BType in keyof BSchema]: PartialBlockFromConfigNoChildren<
    BSchema[BType],
    I,
    S
  >;
};

export type PartialBlockNoDefaults<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = PartialBlocksWithoutChildren<
  BSchema,
  I,
  S
>[keyof PartialBlocksWithoutChildren<BSchema, I, S>] &
  Partial<{
    children: PartialBlockNoDefaults<BSchema, I, S>[];
  }>;

export type SpecificPartialBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  BType extends keyof BSchema,
  S extends StyleSchema,
> = PartialBlocksWithoutChildren<BSchema, I, S>[BType] & {
  children?: BlockNoDefaults<BSchema, I, S>[];
};

export type PartialBlockFromConfig<
  B extends BlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = PartialBlockFromConfigNoChildren<B, I, S> & {
  children?: BlockNoDefaults<BlockSchema, I, S>[];
};

export type BlockIdentifier = { id: string } | string;

export interface BlockImplementation<
  TName extends string,
  TProps extends PropSchema,
> {
  /**
   * A function that converts the block into a DOM element
   */
  render: (
    /**
     * The custom block to render
     */
    block: BlockNoDefaults<Record<TName, BlockConfig<TName, TProps>>, any, any>,
    /**
     * The BlockNote editor instance
     */
    editor: BlockNoteEditor<Record<TName, BlockConfig<TName, TProps>>>,
  ) => {
    dom: HTMLElement | DocumentFragment;
    contentDOM?: HTMLElement;
    ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
    destroy?: () => void;
  };

  /**
   * Exports block to external HTML. If not defined, the output will be the same
   * as `render(...).dom`.
   */
  toExternalHTML?: (
    block: BlockNoDefaults<Record<TName, BlockConfig<TName, TProps>>, any, any>,
    editor: BlockNoteEditor<Record<TName, BlockConfig<TName, TProps>>>,
  ) =>
    | {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
      }
    | undefined;

  /**
   * Parses an external HTML element into a block of this type when it returns the block props object, otherwise undefined
   */
  parse?: (el: HTMLElement) => NoInfer<Partial<Props<TProps>>> | undefined;

  /**
   * The blocks that this block should run before.
   * This is used to determine the order in which blocks are rendered.
   */
  runsBefore?: string[];

  /**
   * Advanced parsing function that controls how content within the block is parsed.
   * This is not recommended to use, and is only useful for advanced use cases.
   */
  parseContent?: (options: { el: HTMLElement; schema: Schema }) => Fragment;
}

export type BlockDefinition<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
> = {
  config: BlockConfig<TName, TProps>;
  implementation: BlockImplementation<NoInfer<TName>, NoInfer<TProps>>;
  extensions?: BlockNoteExtension<any>[];
};

export type ExtractBlockConfig<T> = T extends (
  options: any,
) => BlockDefinition<infer TName, infer TProps>
  ? BlockConfig<TName, TProps>
  : never;
