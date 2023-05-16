import { Attribute, Node } from "@tiptap/core";
import {
  Block,
  BlockConfig,
  BlockSchema,
  BlockSpec,
  PropSchema,
  TipTapNode,
  TipTapNodeConfig,
} from "./blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import styles from "../nodes/Block.module.css";

function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// A function to create a "BlockSpec" from a tiptap node.
// we use this to create the block specs for the built-in blocks

// // TODO: rename to createBlockSpecFromTiptapNode?
// export function createBlockFromTiptapNode<
//   Type extends string,
//   Props extends PropSpecs
// >(blockSpec: BlockSpecWithNode<Type, Props>): BlockSpecWithNode<Type, Props> {
//   if (blockSpec.node.name !== blockSpec.type) {
//     throw Error(
//       "Node must be of type " +
//         blockSpec.type +
//         ", but is of type" +
//         blockSpec.node.name +
//         "."
//     );
//   }
//
//   // TODO: how to handle markdown / html conversions
//
//   // the return type gives us runtime access to the block name, props, and tiptap node
//   // but is also used to generate (derive) the type for the block spec
//   // so that we can have a strongly typed BlockNoteEditor API
//   return blockSpec;
// }

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
>(
  blockConfig: BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>
): BlockSpec<BType, PSchema, { editor: BlockNoteEditor<BSchema> | undefined }> {
  const node = createTipTapBlock<
    BType,
    { editor: BlockNoteEditor<BSchema> | undefined }
  >({
    name: blockConfig.type,
    content: blockConfig.containsInlineContent ? "inline*" : "",
    selectable: blockConfig.containsInlineContent,

    addAttributes() {
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
    },

    addOptions() {
      return {
        editor: undefined,
      };
    },

    parseHTML() {
      // TODO: This won't work for content copied outside BlockNote. Given the
      //  variety of possible custom block types, a one-size-fits-all solution
      //  probably won't work and we'll need an optional parseHTML option.
      return blockConfig.parse
        ? [
            {
              getAttrs: (node: HTMLElement | string) => {
                if (typeof node === "string") {
                  return false;
                }

                return blockConfig.parse!(node);
              },
            },
          ]
        : [
            {
              tag: "div[data-content-type=" + blockConfig.type + "]",
            },
          ];
    },

    // TODO: Do we need renderHTML if we have a node view? Doesn't seem like it
    //  makes sense but throws an error if ctrl+A and ctrl+C if it's not
    //  implemented.
    renderHTML({ HTMLAttributes }) {
      // Create blockContent element
      const blockContent = document.createElement("div");
      // Add blockContent HTML attribute
      blockContent.setAttribute("data-content-type", blockConfig.type);
      // Add props as HTML attributes in kebab-case with "data-" prefix
      for (const [attribute, value] of Object.entries(HTMLAttributes)) {
        blockContent.setAttribute(attribute, value);
      }

      // Gets BlockNote editor instance
      const editor = this.options.editor!;

      // Quite hacky but don't think there's a better way to do this. Since the
      // contentDOM can be anywhere inside the DOM, we don't know which element
      // it is. Calling render() will give us the contentDOM, but we need to
      // provide a block as a parameter.
      const getDummyBlock: () => Block<BlockSchema> = () =>
        ({
          id: "",
          type: "",
          props: {},
          content: [],
          children: [],
        } as Block<BlockSchema>);

      // Render elements
      const rendered = blockConfig.render(getDummyBlock, editor);
      // Add elements to blockContent
      blockContent.appendChild(rendered.dom);

      return {
        dom: blockContent,
        // I don't understand what's going on with the typing here
        contentDOM:
          "contentDOM" in rendered
            ? (rendered.contentDOM as HTMLDivElement)
            : undefined,
      };
    },

    addNodeView() {
      return ({ HTMLAttributes, getPos }) => {
        // Create blockContent element
        const blockContent = document.createElement("div");
        // Sets blockContent class
        blockContent.className = styles.blockContent;
        // Add blockContent HTML attribute
        blockContent.setAttribute("data-content-type", blockConfig.type);
        // Add props as HTML attributes in kebab-case with "data-" prefix
        for (const [attribute, value] of Object.entries(HTMLAttributes)) {
          blockContent.setAttribute(attribute, value);
        }

        // Gets BlockNote editor instance
        const editor = this.options.editor!;
        // Gets position of the node
        const pos = typeof getPos === "function" ? getPos() : undefined;
        // Gets TipTap editor instance
        const tipTapEditor = editor._tiptapEditor;
        // Gets parent blockContainer node
        const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
        // Gets block identifier
        const blockIdentifier = blockContainer.attrs.id;
        // Function to get the block
        const getBlock: () => Block<BSchema> = () =>
          editor.getBlock(blockIdentifier)!;

        // Render elements
        const rendered = blockConfig.render(getBlock, editor);
        // Add elements to blockContent
        blockContent.appendChild(rendered.dom);

        return {
          dom: blockContent,
          // I don't understand what's going on with the typing here
          contentDOM:
            "contentDOM" in rendered
              ? (rendered.contentDOM as HTMLDivElement)
              : undefined,
        };
      };
    },
  });

  return {
    node: node,
    propSchema: blockConfig.propSchema,
  };
}

export function createTipTapBlock<
  Type extends string,
  Options = any,
  Storage = any
>(
  config: TipTapNodeConfig<Type, Options, Storage>
): TipTapNode<Type, Options, Storage> {
  // Type cast is needed as Node.name is mutable, though there is basically no
  // reason to change it after creation. Alternative is to wrap Node in a new
  // class, which I don't think is worth it since we'd only be changing 1
  // attribute to be read only.
  return Node.create({
    ...config,
    group: "blockContent",
  }) as TipTapNode<Type, Options, Storage>;
}
