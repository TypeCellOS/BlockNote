import { Attribute, Attributes, Editor, Node } from "@tiptap/core";
import { Fragment, ParseRule } from "prosemirror-model";
import { BlockNoteEditor, BlockSchemaWithBlock, Props } from "../../..";
import { inlineContentToNodes } from "../../../api/nodeConversions/nodeConversions";
import {
  BlockConfig,
  BlockNoteDOMAttributes,
  BlockSpec,
  PropSchema,
  SpecificBlock,
  TipTapNode,
  TipTapNodeConfig,
} from "./blockTypes";
import { mergeCSSClasses } from "../../../shared/utils";

export function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
export function propsToAttributes<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render"
  >
): Attributes {
  const tiptapAttributes: Record<string, Attribute> = {};

  Object.entries(blockConfig.propSchema).forEach(([name, spec]) => {
    tiptapAttributes[name] = {
      default: spec.default,
      keepOnSplit: true,
      // Props are displayed in kebab-case as HTML attributes. If a prop's
      // value is the same as its default, we don't display an HTML
      // attribute for it.
      parseHTML: (element) => element.getAttribute(camelToDataKebab(name)),
      renderHTML: (attributes) =>
        attributes[name] !== spec.default
          ? {
              [camelToDataKebab(name)]: attributes[name],
            }
          : {},
    };
  });

  return tiptapAttributes;
}

// Function that uses the 'parse' function of a blockConfig to create a
// TipTap node's `parseHTML` property. This is only used for parsing content
// from the clipboard.
export function parse<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render"
  >
) {
  const rules: ParseRule[] = [
    {
      tag: "div[data-content-type=" + blockConfig.type + "]",
    },
  ];

  if (blockConfig.parse) {
    rules.push({
      tag: "*",
      getAttrs(node: string | HTMLElement) {
        if (typeof node === "string") {
          return false;
        }

        const block = blockConfig.parse?.(node);

        if (block === undefined) {
          return false;
        }

        return block.props || {};
      },
      getContent(node, schema) {
        const block = blockConfig.parse?.(node as HTMLElement);

        if (block !== undefined && block.content !== undefined) {
          return Fragment.from(
            typeof block.content === "string"
              ? schema.text(block.content)
              : inlineContentToNodes(block.content, schema)
          );
        }

        return Fragment.empty;
      },
    });
  }

  return rules;
}

// Used to figure out which block should be rendered. This block is then used to
// create the node view.
export function getBlockFromPos<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
>(
  getPos: (() => number) | boolean,
  editor: BlockNoteEditor<BSchema>,
  tipTapEditor: Editor,
  type: BType
) {
  // Gets position of the node
  if (typeof getPos === "boolean") {
    throw new Error(
      "Cannot find node position as getPos is a boolean, not a function."
    );
  }
  const pos = getPos();
  // Gets parent blockContainer node
  const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
  // Gets block identifier
  const blockIdentifier = blockContainer.attrs.id;
  // Gets the block
  const block = editor.getBlock(blockIdentifier)! as SpecificBlock<
    BSchema,
    BType
  >;
  if (block.type !== type) {
    throw new Error("Block type does not match");
  }

  return block;
}

// Function that wraps the `dom` element returned from 'blockConfig.render' in a
// `blockContent` div, which contains the block type and props as HTML
// attributes. If `blockConfig.render` also returns a `contentDOM`, it also adds
// an `inlineContent` class to it.
export function wrapInBlockStructure<
  BType extends string,
  PSchema extends PropSchema
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  },
  blockType: BType,
  blockProps: Props<PSchema>,
  propSchema: PSchema,
  domAttributes?: Record<string, string>
) {
  // Creates `blockContent` element
  const blockContent = document.createElement("div");

  // Adds custom HTML attributes
  if (domAttributes !== undefined) {
    for (const [attr, value] of Object.entries(domAttributes)) {
      if (attr !== "class") {
        blockContent.setAttribute(attr, value);
      }
    }
  }
  // Sets blockContent class
  blockContent.className = mergeCSSClasses(
    "blockContent",
    domAttributes?.class || ""
  );
  // Sets content type attribute
  blockContent.setAttribute("data-content-type", blockType);
  // Add props as HTML attributes in kebab-case with "data-" prefix
  for (const [prop, value] of Object.entries(blockProps)) {
    if (value !== propSchema[prop].default) {
      blockContent.setAttribute(camelToDataKebab(prop), value);
    }
  }

  blockContent.appendChild(element.dom);

  if (element.contentDOM !== undefined) {
    element.contentDOM.className = mergeCSSClasses(
      "inlineContent",
      element.contentDOM.className
    );

    return {
      dom: blockContent,
      contentDOM: element.contentDOM,
    };
  }

  return {
    dom: blockContent,
  };
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
>(
  blockConfig: BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>
): BlockSpec<BType, PSchema, ContainsInlineContent> {
  const node = createTipTapBlock<
    BType,
    ContainsInlineContent,
    {
      editor: BlockNoteEditor<BSchema>;
      domAttributes?: BlockNoteDOMAttributes;
    }
  >({
    name: blockConfig.type,
    content: (blockConfig.containsInlineContent
      ? "inline*"
      : "") as ContainsInlineContent extends true ? "inline*" : "",
    selectable: true,

    addAttributes() {
      return propsToAttributes(blockConfig);
    },

    parseHTML() {
      return parse(blockConfig);
    },

    addNodeView() {
      return ({ getPos }) => {
        // Gets the BlockNote editor instance
        const editor = this.options.editor;
        // Gets the block
        const block = getBlockFromPos<
          BType,
          PSchema,
          ContainsInlineContent,
          BSchema
        >(getPos, editor, this.editor, blockConfig.type);
        // Gets the custom HTML attributes for `blockContent` nodes
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        const content = blockConfig.render(block, editor);

        return wrapInBlockStructure<BType, PSchema>(
          content,
          block.type,
          block.props,
          blockConfig.propSchema,
          blockContentDOMAttributes
        );
      };
    },
  });

  return {
    node: node as TipTapNode<BType, ContainsInlineContent>,
    propSchema: blockConfig.propSchema,
    serialize: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      let element: {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
      };
      if (blockConfig.serialize !== undefined) {
        element = {
          dom: blockConfig.serialize(block as any, editor as any),
        };
      } else {
        element = blockConfig.render(block as any, editor as any);
      }

      return wrapInBlockStructure<BType, PSchema>(
        element,
        block.type as BType,
        block.props as Props<PSchema>,
        blockConfig.propSchema,
        blockContentDOMAttributes
      ).dom;
    },
  };
}

export function createTipTapBlock<
  Type extends string,
  ContainsInlineContent extends boolean,
  Options extends {
    domAttributes?: BlockNoteDOMAttributes;
  } = {
    domAttributes?: BlockNoteDOMAttributes;
  },
  Storage = any
>(
  config: TipTapNodeConfig<Type, ContainsInlineContent, Options, Storage>
): TipTapNode<Type, ContainsInlineContent, Options, Storage> {
  // Type cast is needed as Node.name is mutable, though there is basically no
  // reason to change it after creation. Alternative is to wrap Node in a new
  // class, which I don't think is worth it since we'd only be changing 1
  // attribute to be read only.
  return Node.create<Options, Storage>({
    ...config,
    group: "blockContent",
    content: config.content,
  }) as TipTapNode<Type, ContainsInlineContent, Options, Storage>;
}
