import { Fragment, Schema } from "prosemirror-model";
import { ViewMutationRecord } from "prosemirror-view";
import { Block } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import type { Props, PropSchema } from "../../schema/index.js";

export type BlockDefs = Record<string, BlockConfig<string, PropSchema>>;

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
  TName extends string,
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
    block: Block<Record<TName, BlockConfig<TName, TProps>>>,
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
    block: Block<Record<TName, BlockConfig<TName, TProps>>>,
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

// input rules & keyboard shortcuts where do they fit into this?

export type BlockDefinition<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
> = {
  config: BlockConfig<TName, TProps>;
  implementation: BlockImplementation<NoInfer<TName>, NoInfer<TProps>>;
  extensions?: BlockNoteExtension<any>[];
};

export function createBlockConfig<
  TCallback extends (
    options: Partial<Record<string, any>>,
  ) => BlockConfig<any, any>,
  TOptions extends Parameters<TCallback>[0],
  TName extends ReturnType<TCallback>["type"],
  TProps extends ReturnType<TCallback>["propSchema"],
>(callback: TCallback): (options: TOptions) => BlockConfig<TName, TProps> {
  return callback;
}

export type BlockConfigDefinition<
  T extends (options: any) => BlockConfig<any, any> = (
    options: any,
  ) => BlockConfig<any, any>,
> = T extends (options: any) => BlockConfig<infer TName, infer TProps>
  ? BlockConfig<TName, TProps>
  : never;

export type ExtractOptions<T> = T extends (options: infer TOptions) => any
  ? TOptions
  : never;

export type ExtractBlockConfig<T> = T extends (
  options: any,
) => BlockDefinition<infer TName, infer TProps>
  ? BlockConfig<TName, TProps>
  : never;

export type ExtractBlockImplementation<T> = T extends (
  options: any,
) => BlockDefinition<infer TName, infer TProps>
  ? BlockImplementation<TName, TProps>
  : never;

export type ExtractBlock<T> = T extends (
  options: any,
) => BlockDefinition<infer TName, infer TProps>
  ? Block<Record<TName, BlockConfig<TName, TProps>>>
  : never;

export function createBlockSpec<
  TCallback extends (options: any) => BlockConfig<any, any>,
  TOptions extends Parameters<TCallback>[0],
  TName extends ReturnType<TCallback>["type"],
  TProps extends ReturnType<TCallback>["propSchema"],
>(
  callback: TCallback,
): {
  implementation: (
    cb: (options: TOptions) => BlockImplementation<TName, TProps>,
    addExtensions?: (options: TOptions) => BlockNoteExtension<any>[],
  ) => (options: TOptions) => BlockDefinition<TName, TProps>;
} {
  return {
    implementation: (cb, addExtensions) => (options) => ({
      config: callback(options),
      implementation: cb(options),
      extensions: addExtensions?.(options),
    }),
  };
}
/**
 * This creates an instance of a BlockNoteExtension that can be used to add to a schema.
 * It is a bit of a hack, but it works.
 */
export function createBlockNoteExtension(
  options: Partial<
    Pick<BlockNoteExtension, "inputRules" | "keyboardShortcuts" | "plugins">
  > & { key: string },
) {
  const x = Object.create(BlockNoteExtension.prototype);
  x.key = options.key;
  x.inputRules = options.inputRules;
  x.keyboardShortcuts = options.keyboardShortcuts;
  x.plugins = options.plugins ?? [];
  return x as BlockNoteExtension;
}
