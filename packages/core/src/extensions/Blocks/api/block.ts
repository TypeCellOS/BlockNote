import { DOMSerializer, Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Attribute, Extension, Node } from "@tiptap/core";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import {
  BlockConfig,
  BlockSchema,
  BlockSpec,
  PropSchema,
  TipTapNode,
  TipTapNodeConfig,
} from "./blockTypes";
import styles from "../nodes/Block.module.css";

function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function propsToAttributes<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render"
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

export function parse<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render"
  >
) {
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
}

export function render<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
>(
  blockConfig: Omit<
    BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
    "render"
  >,
  HTMLAttributes: Record<string, any>
) {
  // Create blockContent element
  const blockContent = document.createElement("div");
  // Add blockContent HTML attribute
  blockContent.setAttribute("data-content-type", blockConfig.type);
  // Add props as HTML attributes in kebab-case with "data-" prefix
  for (const [attribute, value] of Object.entries(HTMLAttributes)) {
    blockContent.setAttribute(attribute, value);
  }

  // TODO: This only works for content copied within BlockNote.
  // Creates contentDOM element to serialize inline content into.
  let contentDOM: HTMLDivElement | undefined;
  if (blockConfig.containsInlineContent) {
    contentDOM = document.createElement("div");
    blockContent.appendChild(contentDOM);
  } else {
    contentDOM = undefined;
  }

  return contentDOM !== undefined
    ? {
        dom: blockContent,
        contentDOM: contentDOM,
      }
    : {
        dom: blockContent,
      };
}

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

    renderHTML({ HTMLAttributes }) {
      return render(blockConfig, HTMLAttributes);
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
        if (typeof getPos === "boolean") {
          throw new Error(
            "Cannot find node position as getPos is a boolean, not a function."
          );
        }
        const pos = getPos();
        // Gets TipTap editor instance
        const tipTapEditor = editor._tiptapEditor;
        // Gets parent blockContainer node
        const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
        // Gets block identifier
        const blockIdentifier = blockContainer.attrs.id;

        // Render elements
        const rendered = blockConfig.render(
          editor.getBlock(blockIdentifier)!,
          editor
        );
        // Add elements to blockContent
        blockContent.appendChild(rendered.dom);

        return "contentDOM" in rendered
          ? {
              dom: blockContent,
              contentDOM: rendered.contentDOM,
            }
          : {
              dom: blockContent,
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

const customBlockSerializer = (schema: Schema) => {
  const defaultSerializer = DOMSerializer.fromSchema(schema);

  return new DOMSerializer(
    {
      ...defaultSerializer.nodes,
      // TODO: If a serializer is defined in the config for a custom block, it
      //  should be added here. We still need to figure out how the serializer
      //  should be defined in the custom blocks API though, and implement that,
      //  before we can do this.
    },
    defaultSerializer.marks
  );
};

export const CustomBlockSerializerExtension = Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          clipboardSerializer: customBlockSerializer(this.editor.schema),
        },
      }),
    ];
  },
});
