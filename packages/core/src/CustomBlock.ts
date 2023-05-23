import { Node } from "@tiptap/core";
import { NodeViewRendererProps } from "@tiptap/core";

const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

export type CustomBlock = {
  name: string;

  priority?: number;
  atom?: boolean;
  selectable?: boolean;
  className?: string;
  props?: Record<string, string>;

  element: (props: NodeViewRendererProps) => {
    element: HTMLElement;
    editable?: HTMLElement;
  };
};

export function createCustomBlock(customBlock: CustomBlock) {
  return Node.create<CustomBlock>({
    name: customBlock.name,
    content: "inline*",
    group: "blockContent",
    priority: customBlock.priority,
    atom: customBlock.atom,
    selectable: customBlock.selectable,

    addAttributes() {
      const attrs: Record<string, any> = {};

      if (customBlock.props) {
        for (const [attr, value] of Object.entries(customBlock.props)) {
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
              element.getAttribute("data-content-type") === customBlock.name
            ) {
              const attrs: Record<string, string> = {};

              if (customBlock.props) {
                for (let nodeAttr of Object.keys(customBlock.props)) {
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
        const { element, editable } = customBlock.element(props);
        if (customBlock.className) {
          element.className = customBlock.className;
        }

        element.setAttribute("data-block-type", "block-content");
        element.setAttribute("data-content-type", customBlock.name);

        if (customBlock.props) {
          for (const attr in customBlock.props) {
            if (customBlock.props[attr]) {
              element.setAttribute(kebabize(attr), customBlock.props[attr]!);
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
