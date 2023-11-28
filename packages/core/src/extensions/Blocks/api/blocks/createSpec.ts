import { BlockNoteEditor } from "../../../../BlockNoteEditor";
import { InlineContentSchema } from "../inlineContent/types";
import { StyleSchema } from "../styles/types";
import {
  addBlockContentAttributes,
  createInternalBlockSpec,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
  parse,
  propsToAttributes,
} from "./internal";
import { BlockConfig, BlockFromConfig, BlockSchemaWithBlock } from "./types";

// restrict content to "inline" and "none" only
export type CustomBlockConfig = BlockConfig & {
  content: "inline" | "none";
};

export type CustomBlockImplementation<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: (
    /**
     * The custom block to render
     */
    block: BlockFromConfig<T, I, S>,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>
    // (note) if we want to fix the manual cast, we need to prevent circular references and separate block definition and render implementations
    // or allow manually passing <BSchema>, but that's not possible without passing the other generics because Typescript doesn't support partial inferred generics
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  };
  // Exports block to external HTML. If not defined, the output will be the same
  // as `render(...).dom`. Used to create clipboard data when pasting outside
  // BlockNote.
  // TODO: Maybe can return undefined to ignore when serializing?
  toExternalHTML?: (
    block: BlockFromConfig<T, I, S>,
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createBlockSpec<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
>(blockConfig: T, blockImplementation: CustomBlockImplementation<T, I, S>) {
  const node = createStronglyTypedTiptapNode({
    name: blockConfig.type as T["type"],
    content: (blockConfig.content === "inline"
      ? "inline*"
      : "") as T["content"] extends "inline" ? "inline*" : "",
    group: "blockContent",
    selectable: true,

    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return parse(blockConfig);
    },

    addNodeView() {
      return ({ getPos }) => {
        const editor = this.options.editor;
        const block = getBlockFromPos(
          getPos,
          editor,
          this.editor,
          blockConfig.type
        );

        const output = blockImplementation.render(block as any, editor);

        return addBlockContentAttributes(
          output,
          block.type,
          block.props,
          blockConfig.propSchema,
          this.options.domAttributes
        );
      };
    },
  });

  if (node.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote."
    );
  }

  return createInternalBlockSpec(blockConfig, {
    node,
    toInternalHTML: (block, editor) => {
      const output = blockImplementation.render(block as any, editor as any);

      return addBlockContentAttributes(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        node.options.domAttributes
      );
    },
    toExternalHTML: (block, editor) => {
      let output = blockImplementation.toExternalHTML?.(
        block as any,
        editor as any
      );
      if (output === undefined) {
        output = blockImplementation.render(block as any, editor as any);
      }

      return addBlockContentAttributes(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        node.options.domAttributes
      );
    },
  });
}
