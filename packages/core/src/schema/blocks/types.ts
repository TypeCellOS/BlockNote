/** Define the main block types **/
// import { Extension, Node } from "@tiptap/core";
import type {
  Node,
  NodeViewRenderer,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Fragment, Node as PMNode, Schema } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import type {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
  StyledText,
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

export interface BlockConfigMeta<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
> {
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

  /**
   * Whether this block type gets a side menu drag handle (and can be dragged
   * by it). Applies to any block type, container or not: e.g. a
   * "locked" block can opt out of dragging entirely. A block that opts out is
   * skipped when looking for a drag handle, so the handle falls through to the
   * nearest draggable ancestor.
   * @default true
   */
  draggable?: boolean;

  /**
   * Enables syntax highlighting of the contents of the block with the result of this callback
   */
  highlight?(block: { type: TName; props: Props<TProps> }): string | undefined;

  /**
   * Marks the block as rendering a preview with an editable source popup, driven
   * by the editor-wide `SourceBlockWithPreviewExtension`. When `true`, the
   * block's source is hidden behind its preview and edited via the popup.
   */
  hasPreview?: boolean;
}

/**
 * The type name of a container block, as used in {@link ChildrenConfig.allow}.
 */
export type AllowedChildType = string;

/**
 * What may appear as a child of a container block.
 *
 * - `"blocks"`: any regular block, or any container block placeable anywhere.
 *   This cannot be narrowed to specific regular block types: every regular
 *   block is the *same* ProseMirror node (`blockContainer`), so paragraphs,
 *   headings and code blocks are indistinguishable at the node level.
 * - `readonly AllowedChildType[]`: only these container types, enforced exactly
 *   by the schema. Naming a regular block type is a startup error; per-type
 *   regular-block filtering can be added to this same form later, with no API
 *   change.
 *
 * Neither form includes `placeable: "namedOnly"` types. Those appear only
 * where a parent names them explicitly in an array.
 */
export type ChildrenAllow = "blocks" | readonly AllowedChildType[];

/**
 * Marks a block as a *container*: a block whose body is other blocks, exposed
 * as `block.children` at runtime.
 *
 * The config describes one uniform body, semantically a single implicit
 * slot. Ordered multi-slot bodies (a `sequence` of slots) can be added later
 * as a sibling form.
 */
export type ChildrenConfig = {
  /** What may appear as a child. See {@link ChildrenAllow}. */
  allow: ChildrenAllow;
  /**
   * How few children the container may hold. When children drop below the
   * minimum, a container that can stand anywhere dissolves into its
   * surviving children (a one-column column list is just those blocks), and
   * one that only exists inside another container is topped back up with
   * empty children (a column keeps existing).
   * @default 1
   */
  min?: number;
};

export interface BlockConfig<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" | "plain" =
    | "inline"
    | "none"
    | "table"
    | "plain",
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
  /**
   * Declares owned child blocks, exposed on `block.children`.
   * With `content: "none"`, the block is a pure container whose `render`
   * mounts children through contentDOM (React: contentRef).
   * With `content: "inline"`, `children: { allow: "blocks" }` gives the
   * block an owned body below its title. Titled bodies remain optional;
   * their child types and minimum count cannot be restricted.
   * `renderFrame` independently controls the box around title and body.
   */
  children?: ChildrenConfig;
  /**
   * Where this block may be placed.
   *
   * - `"anywhere"` (default): anywhere a regular block goes, the document
   *   root or nested under any other block.
   * - `"namedOnly"`: only inside a container that names this type in its
   *   `children.allow` array (e.g. a `column` inside a `columnList`).
   *
   * Only meaningful for container blocks; regular blocks are always placeable
   * anywhere.
   */
  placeable?: "anywhere" | "namedOnly";
}

declare module "prosemirror-model" {
  interface NodeSpec {
    /**
     * The config of the BlockNote block this node was built from, so code
     * holding a bare `Node` can read block-level facts (like the content
     * kind) without an editor or schema reference. Set on every node built
     * from a block spec.
     */
    blockConfig?: BlockConfig;
  }
}

/**
 * BlockConfigOrCreator is a union type of BlockConfig and a function that returns a BlockConfig.
 * This is used to create block configs that can be passed to the createBlockSpec function.
 */
export type BlockConfigOrCreator<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" | "plain" = "inline" | "none" | "plain",
  TOptions extends Record<string, any> | undefined =
    | Record<string, any>
    | undefined,
> =
  | BlockConfig<TName, TProps, TContent>
  | (TOptions extends undefined
      ? () => BlockConfig<TName, TProps, TContent>
      : (options: Partial<TOptions>) => BlockConfig<TName, TProps, TContent>);

/**
 * ExtractBlockConfigFromConfigOrCreator is a helper type that extracts the BlockConfig type from a BlockConfigOrCreator.
 */
export type ExtractBlockConfigFromConfigOrCreator<
  ConfigOrCreator extends
    | BlockConfig<string, PropSchema, "inline" | "none" | "plain">
    | ((
        ...args: any[]
      ) => BlockConfig<string, PropSchema, "inline" | "none" | "plain">),
> = ConfigOrCreator extends (...args: any[]) => infer Config
  ? Config
  : ConfigOrCreator;

// restrict content to "inline" and "none" only
export type CustomBlockConfig<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "plain" = "inline" | "none" | "plain",
> = BlockConfig<T, PS, C>;

// A Spec contains both the Config and Implementation
export type BlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" | "plain" =
    | "inline"
    | "none"
    | "table"
    | "plain",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: BlockImplementation<T, PS, C>;
  extensions?: (Extension | ExtensionFactoryInstance)[];
};

/**
 * BlockSpecOrCreator is a union type of BlockSpec and a function that returns a BlockSpec.
 * This is used to create block specs that can be passed to the createBlockSpec function.
 */
export type BlockSpecOrCreator<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" | "plain" =
    | "inline"
    | "none"
    | "table"
    | "plain",
  TOptions extends Record<string, any> | undefined =
    | Record<string, any>
    | undefined,
> =
  | BlockSpec<T, PS, C>
  | (TOptions extends undefined
      ? () => BlockSpec<T, PS, C>
      : (options: Partial<TOptions>) => BlockSpec<T, PS, C>);

/**
 * ExtractBlockSpecFromSpecOrCreator is a helper type that extracts the BlockSpec type from a BlockSpecOrCreator.
 */
export type ExtractBlockSpecFromSpecOrCreator<
  SpecOrCreator extends
    | BlockSpec<string, PropSchema, "inline" | "none" | "plain">
    | ((
        ...args: any[]
      ) => BlockSpec<string, PropSchema, "inline" | "none" | "plain">),
> = SpecOrCreator extends (...args: any[]) => infer Spec ? Spec : SpecOrCreator;

/**
 * This allows de-coupling the types that we display to users versus the types we expose internally.
 *
 * This prevents issues with type-inference across parameters that Typescript cannot handle.
 * Specifically, the blocks shape cannot be properly inferred to a specific type like we expose to the user.
 */
export type LooseBlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "table" | "plain" =
    | "inline"
    | "none"
    | "table"
    | "plain",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: Omit<
    BlockImplementation<T, PS, C>,
    "render" | "renderFrame" | "toExternalHTML"
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
      update?: (node: PMNode) => boolean | void;
    };
    renderFrame?: (
      block: any,
      editor: BlockNoteEditor<any>,
    ) =>
      | {
          dom: HTMLElement | DocumentFragment;
          slot: HTMLElement;
          update?: (block: any) => void;
        }
      | undefined;
    toExternalHTML?: (
      block: any,
      editor: BlockNoteEditor<any>,
      context: {
        nestingLevel: number;
      },
    ) =>
      | {
          dom: HTMLElement | DocumentFragment;
          contentDOM?: HTMLElement;
          childrenDOM?: HTMLElement;
        }
      | undefined;

    node: Node;
  };
  extensions?: (Extension | ExtensionFactoryInstance)[];
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
      "render" | "renderFrame" | "toExternalHTML"
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
        update?: (node: PMNode) => boolean | void;
      };
      renderFrame?: (
        block: any,
        editor: BlockNoteEditor<any>,
      ) =>
        | {
            dom: HTMLElement | DocumentFragment;
            slot: HTMLElement;
            update?: (block: any) => void;
          }
        | undefined;
      toExternalHTML?: (
        block: any,
        editor: BlockNoteEditor<any>,
        context: {
          nestingLevel: number;
        },
      ) =>
        | {
            dom: HTMLElement | DocumentFragment;
            contentDOM?: HTMLElement;
            childrenDOM?: HTMLElement;
          }
        | undefined;
    };
    extensions?: BlockSpec<k>["extensions"];
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
    extensions?: (Extension | ExtensionFactoryInstance)[];
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

// The content of a block with "plain" content (e.g. a code block): unstyled
// text, represented as StyledText items whose `styles` is always empty.
export type PlainContent = (StyledText<{}> & {
  styles: Record<string, never>;
})[];

// Partial form of PlainContent: also accepts bare strings (both as the whole
// content and as array items), which are normalized on write.
export type PartialPlainContent =
  | string
  | (string | (StyledText<{}> & { styles: Record<string, never> }))[];

/**
 * The text of a block's `"plain"` content (e.g. a code block's source code).
 * Accepts the partial form too: block render/export paths can receive
 * `PartialBlock`s (e.g. the HTML serializers take them directly), where
 * plain content may still be the bare-string sugar.
 */
export function plainContentToString(
  content: PlainContent | PartialPlainContent,
): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((item) => (typeof item === "string" ? item : item.text))
    .join("");
}

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
      : B["content"] extends "plain"
        ? PlainContent
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
      : B["content"] extends "plain"
        ? PartialPlainContent
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
  TContent extends "inline" | "none" | "table" | "plain" =
    | "inline"
    | "none"
    | "table"
    | "plain",
> = {
  /** @internal Framework adapter for the outer blockContainer node view. */
  frameNodeView?: NodeViewRenderer;
  /**
   * Metadata
   */
  meta?: BlockConfigMeta<TName, TProps>;
  /**
   * A function that converts the block into a DOM element.
   */
  render: (
    this:
      | Record<string, never>
      | ({
          blockContentDOMAttributes: Record<string, string>;
          propSchema?: TProps;
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
    /**
     * Optional NodeView update hook. Called when the underlying ProseMirror
     * node's attributes change (or its decorations change). Return `false` to
     * tell ProseMirror to destroy and recreate the NodeView (i.e. re-run
     * `render` from scratch). Return `true` (or `undefined`) when you have
     * patched `dom` in-place and PM should keep the existing view.
     *
     * Only honored for container blocks (blocks with `children`), where
     * recreating the node view would remount every child block: e.g. column
     * resizing patches widths in place through this hook. Non-container
     * blocks always recreate on attr changes (see
     * https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464).
     */
    update?: (node: PMNode) => boolean | void;
  };

  /**
   * Draws the chrome *around* a block's content and children: the author's
   * markup wraps both, and the `slot` is where BlockNote mounts them.
   *
   * The slot holds the content first and the children after it. A pure
   * container already owns its outer DOM through `render`.
   *
   * `render` stays the knob for the block's own content. A block may use
   * both: `render` draws the title, `renderFrame` draws the box around title
   * and body. Returning `undefined` declines — the block renders plain — so
   * a block can decide from its props, content, or children whether it is framed.
   *
   * Chrome outside the slot is the author's: ProseMirror leaves its events
   * alone. An `update` hook receives the current block on updates and patches
   * the frame in place. Without it, block changes rebuild the frame.
   */
  renderFrame?: (
    this:
      | Record<string, never>
      | ({
          blockContentDOMAttributes: Record<string, string>;
          propSchema?: TProps;
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
    block: BlockFromConfig<BlockConfig<TName, TProps, TContent>, any, any>,
    editor: BlockNoteEditor<
      Record<TName, BlockConfig<TName, TProps, TContent>>
    >,
  ) =>
    | {
        dom: HTMLElement | DocumentFragment;
        /** Where BlockNote mounts the block's content and/or children. */
        slot: HTMLElement;
        update?: (
          block: BlockFromConfig<
            BlockConfig<TName, TProps, TContent>,
            any,
            any
          >,
        ) => void;
      }
    | undefined;

  /**
   * Exports block to external HTML. If not defined, the output will be the same
   * as `render(...).dom`.
   */
  toExternalHTML?: (
    this: Partial<{
      blockContentDOMAttributes: Record<string, string>;
      propSchema: TProps;
    }>,
    block: BlockFromConfig<BlockConfig<TName, TProps, TContent>, any, any>,
    editor: BlockNoteEditor<
      Record<TName, BlockConfig<TName, TProps, TContent>>
    >,
    context: {
      nestingLevel: number;
    },
  ) =>
    | {
        dom: HTMLElement | DocumentFragment;
        contentDOM?: HTMLElement;
        childrenDOM?: HTMLElement;
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
  parseContent?: (options: {
    el: HTMLElement;
    schema: Schema;
  }) => Fragment | undefined;
};

/**
 * BlockImplementationOrCreator is a union type of BlockImplementation and a function that returns a BlockImplementation.
 * This is used to create block implementations that can be passed to the createBlockSpec function.
 */
export type BlockImplementationOrCreator<
  ConfigOrCreator extends BlockConfigOrCreator = BlockConfigOrCreator,
  TOptions extends Record<string, any> | undefined =
    | Record<string, any>
    | undefined,
  Config extends ExtractBlockConfigFromConfigOrCreator<ConfigOrCreator> =
    ExtractBlockConfigFromConfigOrCreator<ConfigOrCreator>,
> =
  | BlockImplementation<Config["type"], Config["propSchema"], Config["content"]>
  | (TOptions extends undefined
      ? () => BlockImplementation<
          Config["type"],
          Config["propSchema"],
          Config["content"]
        >
      : (
          options: Partial<TOptions>,
        ) => BlockImplementation<
          Config["type"],
          Config["propSchema"],
          Config["content"]
        >);

/**
 * ExtractBlockImplementationFromImplementationOrCreator is a helper type that extracts the BlockImplementation type from a BlockImplementationOrCreator.
 */
export type ExtractBlockImplementationFromImplementationOrCreator<
  ImplementationOrCreator extends
    | BlockImplementation<string, PropSchema, "inline" | "none" | "plain">
    | ((
        ...args: any[]
      ) => BlockImplementation<
        string,
        PropSchema,
        "inline" | "none" | "plain"
      >),
> = ImplementationOrCreator extends (...args: any[]) => infer Implementation
  ? Implementation
  : ImplementationOrCreator;

// restrict content to "inline" and "none" only
export type CustomBlockImplementation<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" | "plain" = "inline" | "none" | "plain",
> = Omit<BlockImplementation<T, PS, C>, "frameNodeView">;
