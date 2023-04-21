import { Attribute, Node } from "@tiptap/core";
import { PropsFromPropSpec, PropSpec } from "./blockTypes";

function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// function dataKebabToCamel(str: string): string {
//   const withoutData = str.replace(/^data-/, "");
//   return withoutData.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
// }

// A function to create a "BlockSpec" from a tiptap node.
// we use this to create the block specs for the built-in blocks

// TODO: rename to createBlockSpecFromTiptapNode?
export function createBlockFromTiptapNode<
  Type extends string,
  Props extends readonly PropSpec[]
>(
  blockType: Type,
  options: {
    props: Props;
  },
  node: Node<any, any>
) {
  if (node.name !== blockType) {
    throw Error(
      "Node must be of type " + blockType + ", but is of type" + node.name + "."
    );
  }

  // TODO: how to handle markdown / html conversions

  // the return type gives us runtime access to the block name, props, and tiptap node
  // but is also used to generate (derive) the type for the block spec
  // so that we can have a strongly typed BlockNoteEditor API
  return {
    type: blockType,
    node,
    // TODO: rename to propSpec?
    acceptedProps: options.props,
  };
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createCustomBlock<
  Type extends string,
  Props extends readonly PropSpec[]
>(
  blockType: Type,
  options: (
    | {
        // for blocks with a single inline content element
        inlineContent: true;
        render: () => { dom: HTMLElement; contentDOM: HTMLElement };
      }
    | {
        // for custom blocks that don't support content
        inlineContent: false;
        render: () => { dom: HTMLElement };
      }
  ) & {
    props: Props;
    parseHTML?: (element: HTMLElement) => PropsFromPropSpec<Props>;
    // todo: possibly add parseDom options / other options we need
  }
) {
  const node = Node.create({
    name: blockType,
    group: "blockContent",
    content: options.inlineContent ? "inline*" : "",

    addAttributes() {
      const tiptapAttributes: Record<string, Attribute> = {};

      Object.values(options.props).forEach((propSpec) => {
        tiptapAttributes[propSpec.name] = {
          default: propSpec.default,
          keepOnSplit: false,
          parseHTML: (element) =>
            element.getAttribute(camelToDataKebab(propSpec.name)),
          renderHTML: (attributes) =>
            attributes[propSpec.name] !== propSpec.default
              ? {
                  [camelToDataKebab(propSpec.name)]: attributes[propSpec.name],
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
      return [
        {
          tag: "div[data-content-type=" + blockType + "]",
        },
      ];
    },

    // TODO, create node from render / inlineContent / other props from options
    renderHTML({ HTMLAttributes }) {
      // Create blockContent element
      const blockContent = document.createElement("div");
      // Add blockContent HTML attribute
      blockContent.setAttribute("data-content-type", blockType);
      // Add props as HTML attributes
      for (const [attribute, value] of Object.entries(HTMLAttributes)) {
        blockContent.setAttribute(attribute, value);
      }
      // Render content
      const rendered = options.render();
      // TODO: Should we always assume contentDOM is always a descendant of dom?
      // Add content to blockContent element
      blockContent.appendChild(rendered.dom);

      return blockContent;
    },
  });

  return createBlockFromTiptapNode(blockType, { props: options.props }, node);
}
