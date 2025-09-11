/** Define the main block types **/
// import { Extension, Node } from "@tiptap/core";
import type { Node, NodeViewRendererProps } from "@tiptap/core";
import type { Fragment, Schema } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import type {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
} from "../inlineContent/types.js";
import type { PropSchema, Props } from "../propTypes.js";
import type { StyleSchema } from "../styles/types.js";

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
   * Defines which keyboard shortcut should be used to insert a hard break into the block's inline content.
   * @default "shift+enter"
   */
  hardBreakShortcut?: "shift+enter" | "enter" | "none";

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

  /**
   * Whether the block is a {@link https://prosemirror.net/docs/ref/#model.NodeSpec.isolating} block
   */
  isolating?: boolean;
}

/**
 * BlockConfig contains the "schema" info about a Block type
 * i.e. what props it supports, what content it supports, etc.
 */
export interface BlockConfig<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" = "inline" | "none" | "table",
> {
  /**
   * The type of the block (unique identifier within a schema)
   */
  type: T;
  /**
   * The properties that the block supports
   * @todo will be zod schema in the future
   */
  readonly propSchema: PS;
  /**
   * The content that the block supports
   */
  content: C;
  // TODO: how do you represent things that have nested content?
  // e.g. tables, alerts (with title & content)
}

// restrict content to "inline" and "none" only
export type CustomBlockConfig<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" = "inline" | "none",
> = BlockConfig<T, PS, C>;

// A Spec contains both the Config and Implementation
export type BlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" = "inline" | "none" | "table",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: BlockImplementation<T, PS, C>;
  extensions?: BlockNoteExtension<any>[];
};

/**
 * This allows de-coupling the types that we display to users versus the types we expose internally.
 *
 * This prevents issues with type-inference across parameters that Typescript cannot handle.
 * Specifically, the blocks shape cannot be properly inferred to a specific type like we expose to the user.
 */
export type LooseBlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" = "inline" | "none" | "table",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: Omit<
    BlockImplementation<T, PS, C>,
    "render" | "toExternalHTML"
  > & {
    // purposefully stub the types for render and toExternalHTML since they reference the block
    render: (
      /**
       * The custom block to render
       */
      block: any,
      /**
       * The BlockNote editor instance
       */
      editor: BlockNoteEditor<any>,
    ) => {
      dom: HTMLElement | DocumentFragment;
      contentDOM?: HTMLElement;
      ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
      destroy?: () => void;
    };
    toExternalHTML?: (
      block: any,
      editor: BlockNoteEditor<any>,
    ) =>
      | {
          dom: HTMLElement | DocumentFragment;
          contentDOM?: HTMLElement;
        }
      | undefined;

    node: Node;
  };
  extensions?: BlockNoteExtension<any>[];
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

export type BlockSpecs = {
  [k in string]: {
    config: BlockSpec<k>["config"];
    implementation: Omit<
      BlockSpec<k>["implementation"],
      "render" | "toExternalHTML"
    > & {
      // purposefully stub the types for render and toExternalHTML since they reference the block
      render: (
        /**
         * The custom block to render
         */
        block: any,
        /**
         * The BlockNote editor instance
         */
        editor: BlockNoteEditor<any>,
      ) => {
        dom: HTMLElement | DocumentFragment;
        contentDOM?: HTMLElement;
        ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
        destroy?: () => void;
      };
      toExternalHTML?: (
        block: any,
        editor: BlockNoteEditor<any>,
      ) =>
        | {
            dom: HTMLElement | DocumentFragment;
            contentDOM?: HTMLElement;
          }
        | undefined;
    };
    extensions?: BlockNoteExtension<any>[];
  };
};

export type BlockImplementations = Record<
  string,
  BlockImplementation<any, any>
>;

export type BlockSchemaFromSpecs<BS extends BlockSpecs> = {
  [K in keyof BS]: BS[K]["config"];
};

export type BlockSpecsFromSchema<BS extends BlockSchema> = {
  [K in keyof BS]: {
    config: BlockConfig<BS[K]["type"], BS[K]["propSchema"], BS[K]["content"]>;
    implementation: BlockImplementation<
      BS[K]["type"],
      BS[K]["propSchema"],
      BS[K]["content"]
    >;
    extensions?: BlockNoteExtension<any>[];
  };
};

export type BlockSchemaWithBlock<T extends string, C extends BlockConfig> = {
  [k in T]: C;
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
      : B["content"] extends "none"
        ? undefined
        : never;
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

export type BlockImplementation<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" | "table" = "inline" | "none" | "table",
> = {
  /**
   * Metadata
   */
  meta?: BlockConfigMeta;
  /**
   * A function that converts the block into a DOM element
   */
  render: (
    this:
      | Record<string, never>
      | ({
          blockContentDOMAttributes: Record<string, string>;
        } & (
          | {
              renderType: "nodeView";
              props: NodeViewRendererProps;
            }
          | {
              renderType: "dom";
              props: undefined;
            }
        )),
    /**
     * The custom block to render
     */
    block: BlockFromConfig<BlockConfig<TName, TProps, TContent>, any, any>,
    /**
     * The BlockNote editor instance
     */
    editor: BlockNoteEditor<
      Record<TName, BlockConfig<TName, TProps, TContent>>
    >,
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
    this: Partial<{
      blockContentDOMAttributes: Record<string, string>;
    }>,
    block: BlockFromConfig<BlockConfig<TName, TProps, TContent>, any, any>,
    editor: BlockNoteEditor<
      Record<TName, BlockConfig<TName, TProps, TContent>>
    >,
  ) =>
    | {
        dom: HTMLElement | DocumentFragment;
        contentDOM?: HTMLElement;
      }
    | undefined;

  /**
   * Parses an external HTML element into a block of this type when it returns the block props object, otherwise undefined
   */
  parse?: (el: HTMLElement) => Partial<Props<TProps>> | undefined;

  /**
   * The blocks that this block should run before.
   * This is used to determine the order in which blocks are parsed
   */
  runsBefore?: string[];

  /**
   * Advanced parsing function that controls how content within the block is parsed.
   * This is not recommended to use, and is only useful for advanced use cases.
   */
  parseContent?: (options: { el: HTMLElement; schema: Schema }) => Fragment;
};

// restrict content to "inline" and "none" only
export type CustomBlockImplementation<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" = "inline" | "none",
> = BlockImplementation<T, PS, C>;
