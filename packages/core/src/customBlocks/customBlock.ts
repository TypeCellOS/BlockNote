import { Node } from "@tiptap/core";
import { NodeViewRendererProps } from "@tiptap/core";

const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

export type CustomBlock = {
  type: string;

  priority?: number;
  atom?: boolean;
  selectable?: boolean;
  className?: string;
  attributes?: Record<string, string | undefined>;

  element: (props: NodeViewRendererProps) => {
    element: HTMLElement;
    editable?: HTMLElement;
  };
};

export function createCustomBlock(customBlock: CustomBlock) {
  return Node.create<CustomBlock>({
    name: customBlock.type,
    content: "inline*",
    priority: customBlock.priority,
    atom: customBlock.atom,
    selectable: customBlock.selectable,

    addAttributes() {
      const attrs: Record<string, any> = {};
      console.log(customBlock);

      if (customBlock.attributes) {
        for (const [attr, value] of Object.entries(customBlock.attributes)) {
          attrs[attr] = { default: value };
        }
      }

      return attrs;
    },

    parseHTML() {
      return [
        {
          tag: "div",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }

            if (
              element.getAttribute("data-node-type") === "block-content" &&
              "data-content-type" === customBlock.type
            ) {
              const attrs: Record<string, string> = {};

              if (customBlock.attributes) {
                for (let nodeAttr of Object.keys(customBlock.attributes)) {
                  if (element.getAttribute(kebabize(nodeAttr))) {
                    attrs[nodeAttr] = element.getAttribute(kebabize(nodeAttr))!;
                  }
                }
              }

              return attrs;
            }

            return false;
          },
        },
      ];
    },

    renderHTML() {
      return ["div"];
    },

    addNodeView() {
      return (props: NodeViewRendererProps) => {
        console.log(props);
        const { element, editable } = customBlock.element(props);
        if (customBlock.className) element.className = customBlock.className;

        element.setAttribute("data-block-type", "block-content");
        element.setAttribute("data-content-type", customBlock.type);

        if (customBlock.attributes) {
          for (const attr in customBlock.attributes) {
            if (customBlock.attributes[attr]) {
              element.setAttribute(
                kebabize(attr),
                customBlock.attributes[attr]!
              );
            }
          }
        }

        return {
          dom: element,
          contentDOM: editable,
        };
      };
    },
  });
}
