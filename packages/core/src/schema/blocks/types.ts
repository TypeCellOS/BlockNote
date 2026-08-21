/** Define the main block types **/
// import { Extension, Node } from "@tiptap/core";
import type { Node, NodeViewRendererProps } from "@tiptap/core";
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
   * by it). Applies to any block type, not just container blocks — e.g. a
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
 * What may appear as a child of a container block.
 *
 * - `"any"`: any regular block, or any container block placeable anywhere.
 * - `"blocks"`: regular (non-container) blocks only. This cannot be narrowed
 *   to specific block types: every regular block is the *same* ProseMirror
 *   node (`blockContainer`), so paragraphs, headings and code blocks are
 *   indistinguishable at the node level.
 * - `"containers"`: any container block placeable anywhere, no regular blocks.
 * - `readonly string[]`: only these types — enforced exactly by the schema.
 *   Today the array may only name *container* block types (naming a regular
 *   block type is a startup error); it is the reserved place where per-type
 *   regular-block filtering lands later, with no API change.
 *
 * The wildcards (`"any"`, `"containers"`) never include
 * `placement: "containerOnly"` types — those appear only where a parent names
 * them explicitly in an array.
 */
export type ChildrenAllow = "any" | "blocks" | "containers" | readonly string[];

/**
 * Marks a block as a *container*: a block whose body is other blocks, exposed
 * as `block.children` at runtime.
 *
 * The config describes one uniform body — semantically a single implicit
 * slot, which is what leaves room for ordered multi-slot bodies (a `sequence`
 * of slots) to arrive later as a sibling form.
 */
export type ChildrenConfig = {
  /** What may appear as a child. See {@link ChildrenAllow}. */
  allow: ChildrenAllow;
  /** @default 1 */
  min?: number;
  /** @default unbounded */
  max?: number;
  /**
   * Children to create the container with when it is inserted without an
   * explicit `children` array. When omitted, BlockNote fills the container
   * with whatever its content expression requires (usually one empty
   * paragraph), so a container can never be created in an invalid state.
   *
   * Also the seed that `whenEmptied: "refill"` tops up from, when children
   * drop below `min`.
   */
  default?: readonly PartialBlockNoDefaults<any, any, any>[];
  /**
   * What happens as children are emptied out (Backspace merges the last child
   * away, `removeBlocks` deletes children, ...) and fewer than `min` non-empty
   * children remain:
   *
   * - `"refill"` (the default): drop the emptied children and top the
   *   container back up to `min`, seeding the missing positions from the
   *   unconsumed tail of `default` (falling back to empty blocks when
   *   `default` is absent or too short).
   * - `"unwrap"`: drop the emptied children and replace the container with its
   *   survivors, or remove it entirely when none remain. Column lists use this
   *   so emptied columns disappear and a one-column list unwraps.
   *
   * Coupled to the child count, so it lives here rather than in `meta`:
   * ProseMirror's schema fitting always pads a container back up to its
   * minimum with empty children, so "effectively below the minimum" can only
   * be detected by discounting those.
   * @default "refill"
   */
  whenEmptied?: "refill" | "unwrap";
  /**
   * What may cross the container's edge.
   *
   * - `"open"`: everything crosses the edge — the caret, editing gestures
   *   and text selections (ProseMirror `isolating: false`). Right for flow
   *   regions like column lists, where a selection may span columns.
   * - `"isolated"` (the default): the caret and editing gestures cross
   *   exactly as with `"open"`; only a text selection cannot span the edge
   *   (`isolating: true`).
   * - `"sealed"`: atomic to gestures, like a table cell — the caret doesn't
   *   enter via arrows/Backspace, and the block selects as a unit
   *   (`isolating: true`). Key-agnostic, so compartments need no hand-written
   *   keyboard handlers.
   *
   * Seals bind editing gestures only: the block manipulation API
   * (`insertBlocks` etc.) ignores them.
   * @default "isolated"
   */
  boundary?: "open" | "isolated" | "sealed";
};

// `ResolvedChildren` — the fully-defaulted, desugared shape a `ChildrenConfig`
// compiles to — is internal machinery, not part of the consumer-facing config
// surface, so it lives in `./children.ts` (which is not re-exported wholesale)
// rather than here, where `export *` would leak it onto `@blocknote/core`'s
// public types.

/**
 * BlockConfig contains the "schema" info about a Block type
 * i.e. what props it supports, what content it supports, etc.
 */
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
   * Makes this a *container* block: a block whose body is other blocks,
   * exposed on `block.children`. The block's `render` places them via
   * `contentRef` (React) / `contentDOM` (vanilla), the same way it would place
   * inline content.
   *
   * Can be combined with `content: "inline"` / `"plain"`, in which case the
   * block has its own content *and* children, and both are placed in that one
   * editable region. Only `content: "table"` is incompatible.
   *
   * `children: { allow: "any" }` is the minimal container.
   */
  children?: ChildrenConfig;
  /**
   * Where this block may be placed.
   *
   * - `"anywhere"` (default): anywhere a regular block goes — the document
   *   root, or nested under any other block.
   * - `"containerOnly"`: only inside a container that names this type in its
   *   `children.allow` array (e.g. a `column` inside a `columnList`).
   *
   * Only meaningful for container blocks; regular blocks are always placeable
   * anywhere.
   */
  placement?: "anywhere" | "containerOnly";
}

declare module "prosemirror-model" {
  interface NodeSpec {
    /**
     * The config of the BlockNote block this node was built from, so code
     * holding a bare `Node` can read block-level facts (children config,
     * placement, ...) without an editor or schema reference. Set on every
     * node built from a block spec; a container's generated
     * `__content`/`__children` nodes carry their owning block's config.
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
      /** See {@link BlockImplementation.render}'s `rootDOM`. */
      rootDOM?: HTMLElement | null;
      ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
      destroy?: () => void;
      update?: (node: PMNode) => boolean | void;
    };
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
    /**
     * Nodes the block's own node needs in the schema but which aren't blocks
     * themselves — the generated content & children nodes of a container block
     * that has its own content. Registered alongside `node`.
     */
    extraNodes?: Node[];
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
        /** See {@link BlockImplementation.render}'s `rootDOM`. */
        rootDOM?: HTMLElement | null;
        ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
        destroy?: () => void;
        update?: (node: PMNode) => boolean | void;
      };
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
  /**
   * Metadata
   */
  meta?: BlockConfigMeta<TName, TProps>;
  /**
   * A function that converts the block into a DOM element
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
    /**
     * The block author's own root element, when it isn't `dom` itself. React
     * renders a node view through wrapper elements of its own, so the element
     * ProseMirror is handed is not the one the author wrote — this points at
     * the latter, and is what container attributes (`data-node-type`,
     * `data-id`, prop `data-*`) are stamped onto.
     * @default dom
     */
    rootDOM?: HTMLElement | null;
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
     * recreating the node view would remount every child block — e.g. column
     * resizing patches widths in place through this hook. Non-container
     * blocks always recreate on attr changes (see
     * https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464).
     */
    update?: (node: PMNode) => boolean | void;
  };

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
> = BlockImplementation<T, PS, C>;
