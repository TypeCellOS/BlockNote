import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";
export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export const ImageContentBlock = Node.create<IBlock>({
  name: "imagecontent",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      position: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-position": attributes.position,
          };
        },
        parseHTML: (element) => element.getAttribute("data-position"),
      },
      src: {
        default:
          // "https://images.cdn.circlesix.co/image/1/1366/0/uploads/posts/2022/11/0d255e42f0697238c65ca74ded8017c3.jpg",
          undefined,
      },
    };
  },

  content: "image",

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "block-content") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }

          return false;
        },
      },
      // {
      //   tag: "img",
      //   priority: 200,
      //   getAttrs: (element) => {
      //     if (typeof element === "string") {
      //       return false;
      //     }
      //
      //     if (element.getAttribute("src")) {
      //       return { src: element.getAttribute("src") };
      //     }
      //
      //     return false;
      //   },
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        src: HTMLAttributes.src,
        "data-node-type": "block-content",
      }),
      // TODO: The extra nested div is only needed for placeholders, different solution (without extra div) would be preferable
      // We can't use the other div because the ::before attribute on that one is already reserved for list-bullets
      // ["div", 0],
    ];
  },
});
