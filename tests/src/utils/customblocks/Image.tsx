import {
  BlockNoteEditor,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { RiImage2Fill } from "react-icons/ri";
export const Image = createBlockSpec(
  {
    type: "image" as const,
    propSchema: {
      ...defaultProps,
      src: {
        default: "https://via.placeholder.com/1000",
      },
    } as const,
    content: "inline",
  },
  {
    render: (block) => {
      const image = document.createElement("img");
      image.setAttribute("src", block.props.src);
      image.setAttribute("contenteditable", "false");
      image.setAttribute("style", "width: 100%");
      image.setAttribute("alt", "Image");

      const caption = document.createElement("div");
      caption.setAttribute("style", "flex-grow: 1");

      const parent = document.createElement("div");
      parent.setAttribute("style", "display: flex; flex-direction: column;");
      parent.appendChild(image);
      parent.appendChild(caption);

      return {
        dom: parent,
        contentDOM: caption,
      };
    },
    parse: (element) => {
      if (element.hasAttribute("src")) {
        return {
          src: element.getAttribute("src")!,
        };
      }

      return;
    },
  }
);

export const insertImage = {
  title: "Insert Image",
  onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
    const src = prompt("Enter image URL") || "https://via.placeholder.com/1000";
    editor.insertBlocks(
      [
        {
          type: "image",
          props: {
            src,
          },
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  subtext: "Insert an image",
  icon: <RiImage2Fill />,
  aliases: ["image", "img", "picture", "media"],
  group: "Other",
};
