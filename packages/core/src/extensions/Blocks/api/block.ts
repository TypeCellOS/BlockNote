import { Attribute, Node } from "@tiptap/core";
import {
  BlockSpec,
  BlockSpecWithNode,
  PropSpecs,
  PropTypes,
  TipTapNode,
  TipTapNodeConfig,
} from "./blockTypes";

function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function dataKebabToCamel(str: string): string {
  const withoutData = str.replace(/^data-/, "");
  return withoutData.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// A function to create a "BlockSpec" from a tiptap node.
// we use this to create the block specs for the built-in blocks

// TODO: rename to createBlockSpecFromTiptapNode?
export function createBlockFromTiptapNode<
  Type extends string,
  Props extends PropSpecs
>(blockSpec: BlockSpecWithNode<Type, Props>): BlockSpecWithNode<Type, Props> {
  // if (blockSpec.node.name !== blockSpec.type) {
  //   throw Error(
  //     "Node must be of type " +
  //       blockSpec.type +
  //       ", but is of type" +
  //       blockSpec.node.name +
  //       "."
  //   );
  // }

  // TODO: how to handle markdown / html conversions

  // the return type gives us runtime access to the block name, props, and tiptap node
  // but is also used to generate (derive) the type for the block spec
  // so that we can have a strongly typed BlockNoteEditor API
  return blockSpec;
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createCustomBlock<
  Type extends string,
  Props extends PropSpecs,
  ContainsInlineContent extends boolean
>(
  blockSpec: BlockSpec<Type, Props, ContainsInlineContent>
): BlockSpecWithNode<Type, Props> {
  const node = createTipTapNode({
    name: blockSpec.type,
    content: blockSpec.containsInlineContent ? "inline*" : "",

    addAttributes() {
      const tiptapAttributes: Record<string, Attribute> = {};

      Object.entries(blockSpec.propSpecs).forEach(([name, spec]) => {
        tiptapAttributes[name] = {
          default: spec.default,
          keepOnSplit: true,
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

    parseHTML() {
      // TODO: This won't work for content copied outside BlockNote. Given the
      //  variety of possible custom block types, a one-size-fits-all solution
      //  probably won't work and we'll need an optional parseHTML option.
      return blockSpec.parse
        ? [
            {
              getAttrs: (node: HTMLElement | string) => {
                if (typeof node === "string") {
                  return false;
                }

                return blockSpec.parse!(node);
              },
            },
          ]
        : [
            {
              tag: "div[data-content-type=" + blockSpec.type + "]",
            },
          ];
    },

    // TODO, create node from render / inlineContent / other props from options
    renderHTML({ HTMLAttributes }) {
      // Create blockContent element
      const blockContent = document.createElement("div");
      // Add blockContent HTML attribute
      blockContent.setAttribute("data-content-type", blockSpec.type);
      // Add props as HTML attributes in kebab-case with "data-" prefix
      for (const [attribute, value] of Object.entries(HTMLAttributes)) {
        blockContent.setAttribute(attribute, value);
      }

      // Converting kebab-case props with "data-" prefix to camelCase
      const props: PropTypes<Props> = Object.fromEntries(
        Object.entries<string>(HTMLAttributes).map(([attribute, value]) => [
          dataKebabToCamel(attribute) as PropTypes<Props>,
          value,
        ])
      );

      // Render elements
      const rendered = blockSpec.render(props);
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
  });

  return {
    node: node,
    propSpecs: blockSpec.propSpecs,
  };
}

export function createTipTapNode<
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

// export function createSchema(
//   blockSpecs: Schema<Record<string, BlockSpecWithNode<string, PropSpecs>>>
// );

export const imageBlock = createCustomBlock({
  type: "image",
  propSpecs: {
    src: {
      default:
        "https://www.typescriptlang.org/static/TypeScript%20Types-ae199d69aeecf7d4a2704a528d0fd3f9.png" as const,
    },
  },
  containsInlineContent: false,
  render: (props) => {
    const img = document.createElement("img");
    img.setAttribute("src", props.src);
    return { dom: img };
  },
});
