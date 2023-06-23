import { Attribute, Editor, Node } from "@tiptap/core";
import { Fragment, ParseRule } from "prosemirror-model";
import { BlockNoteEditor, SpecificBlock } from "../../..";
import { inlineContentToNodes } from "../../../api/nodeConversions/nodeConversions";
import styles from "../nodes/Block.module.css";
import {
  BlockConfig,
  BlockSchema,
  BlockSpec,
  PropSchema,
  TipTapNode,
  TipTapNodeConfig,
} from "./blockTypes";

export function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
export function propsToAttributes<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render" | "serialize"
  >
) {
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
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render" | "serialize"
  >
) {
  const rules: ParseRule[] = [
    {
      tag: "div[data-content-type=" + blockConfig.type + "]",
    },
  ];

  if (blockConfig.parse) {
    rules.push({
      getAttrs(node: string | HTMLElement) {
        console.log("parse");
        if (typeof node === "string") {
          return false;
        }

        const block = blockConfig.parse!(node);

        return block ? block.props || {} : false;
      },
      getContent(node, schema) {
        console.log("content");
        const block = blockConfig.parse!(node as HTMLElement);

        if (block && block.content) {
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

// Function that wraps the `dom` element returned from 'blockConfig.render' in a
// `blockContent` div, which contains the block type and props as HTML
// attributes. If `blockConfig.render` also returns a `contentDOM`, it also adds
// an `inlineContent` class to it.
export function renderWithBlockStructure<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
>(
  render: BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>["render"],
  block: SpecificBlock<BSchema, BType>,
  editor: BlockNoteEditor<BSchema>
) {
  // Create blockContent element
  const blockContent = document.createElement("div");
  // Sets blockContent class
  blockContent.className = styles.blockContent;
  // Add blockContent HTML attribute
  blockContent.setAttribute("data-content-type", block.type);
  // Add props as HTML attributes in kebab-case with "data-" prefix
  for (const [prop, value] of Object.entries(block.props)) {
    blockContent.setAttribute(camelToDataKebab(prop), value);
  }

  // Renders elements
  const rendered = render(block, editor);
  // Add inlineContent class to inline content
  if ("contentDOM" in rendered) {
    rendered.contentDOM.className = `${
      rendered.contentDOM.className
        ? rendered.contentDOM.className + " " + styles.inlineContent
        : styles.inlineContent
    }`;
  }
  // Adds elements to blockContent
  blockContent.appendChild(rendered.dom);

  return "contentDOM" in rendered
    ? {
        dom: blockContent,
        contentDOM: rendered.contentDOM,
      }
    : {
        dom: blockContent,
      };
}

export function getBlockFromPos<
  BType extends string,
  PSchema extends PropSchema,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
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

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
>(
  blockConfig: BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>
): BlockSpec<BType, PSchema> {
  const node = createTipTapBlock<BType>({
    name: blockConfig.type,
    content: blockConfig.containsInlineContent ? "inline*" : "",
    selectable: blockConfig.containsInlineContent,

    addOptions() {
      return {
        editor: undefined,
      };
    },

    addAttributes() {
      return propsToAttributes(blockConfig);
    },

    parseHTML() {
      return parse(blockConfig);
    },

    addNodeView() {
      return ({ getPos }) => {
        // Gets the BlockNote editor instance
        const editor = this.options.editor as BlockNoteEditor<BSchema>;
        // Gets the block
        const block = getBlockFromPos<BType, PSchema, BSchema>(
          getPos,
          editor,
          this.editor,
          blockConfig.type
        );

        return renderWithBlockStructure<
          BType,
          PSchema,
          ContainsInlineContent,
          BSchema
        >(blockConfig.render, block, editor);
      };
    },
  });

  return {
    node: node,
    propSchema: blockConfig.propSchema,
    serialize: (block, editor) =>
      renderWithBlockStructure<BType, PSchema, boolean, BSchema>(
        blockConfig.serialize
          ? (block, editor) => ({ dom: blockConfig.serialize!(block, editor) })
          : blockConfig.render,
        block,
        // TODO: Fix typing
        editor as any
      ),
  };
}

export function createTipTapBlock<Type extends string>(
  config: TipTapNodeConfig<Type>
): TipTapNode<Type> {
  // Type cast is needed as Node.name is mutable, though there is basically no
  // reason to change it after creation. Alternative is to wrap Node in a new
  // class, which I don't think is worth it since we'd only be changing 1
  // attribute to be read only.
  return Node.create({
    ...config,
    group: "blockContent",
  }) as TipTapNode<Type>;
}
