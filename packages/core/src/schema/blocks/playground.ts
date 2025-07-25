import { ViewMutationRecord } from "prosemirror-view";
import type { Props, PropSchema } from "../../schema/index.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { Block } from "../../blocks/defaultBlocks.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

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
    dom: HTMLElement;
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

  // TODO there needs to be simper way to do this, it is a bit of a gap to force them to bridge html to block content
  // parseContent?: (
  //   el: HTMLElement,
  // ) => Block<Record<TName, BlockConfig<TName, TProps>>>["children"];

  // // TODO this should be only on extensions, not on the block config
  // /**
  //  * Input rules for the block
  //  */
  // inputRules?: {
  //   /**
  //    * The regex to match when to trigger the input rule
  //    */
  //   find: RegExp;
  //   /**
  //    * The function to call when the input rule is matched
  //    */
  //   replace: (props: { match: RegExpMatchArray }) =>
  //     | undefined
  //     | {
  //         type: string;
  //         props: Partial<Props<TProps>>;
  //       };
  // }[];

  // keymap?: {
  //   [key: string]: {
  //     type: "replace" | "insert";
  //     predicate: (
  //       editor: BlockNoteEditor<Record<TName, BlockConfig<TName, TProps>>>,
  //     ) => boolean;
  //     action: (
  //       editor: BlockNoteEditor<Record<TName, BlockConfig<TName, TProps>>>,
  //     ) => boolean;
  //   };
  // };
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
