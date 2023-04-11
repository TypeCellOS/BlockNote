import { Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export const ImageBlockContent = Node.create({
  name: "image",
  group: "blockContent",
  content: "inline*",

  addAttributes() {
    return {
      src: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) => {
          return {
            "data-src": attributes.src,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-content-type") === this.name) {
            console.log("jhytfhtfhft");
            console.log(element);
            console.log(
              (element.lastChild! as HTMLElement).getAttribute("data-src")
            );
            return {
              src: element.getAttribute("data-src"),
            };
          }

          return false;
        },
        node: "image",
      },
      {
        tag: "img",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.tagName !== "IMG") {
            return false;
          }

          return { src: element.getAttribute("src") };
        },
        node: "image",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockContent = document.createElement("div");
    blockContent.className = styles.blockContent;
    blockContent.setAttribute("data-content-type", this.name);

    for (const [attr, value] of Object.entries(HTMLAttributes)) {
      blockContent.setAttribute(attr, value);
    }

    // Caption element is before image element to simplify CSS.
    // TODO: Make styles more robust to deal with custom blocks.
    const editable = document.createElement("p");
    blockContent.appendChild(editable);

    const image = document.createElement("img");
    image.setAttribute("src", HTMLAttributes["data-src"]);
    blockContent.appendChild(image);

    return {
      dom: blockContent,
      contentDOM: editable,
    };
  },
});
