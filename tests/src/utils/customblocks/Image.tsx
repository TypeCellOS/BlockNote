import {
  BlockSchemaWithBlock,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
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

export const insertImage: ReactSlashMenuItem<
  BlockSchemaWithBlock<"image", typeof Image.config>,
  any,
  any
> = {
  name: "Insert Image",
  execute: (editor) => {
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
  aliases: ["image", "img", "picture", "media"],
  group: "Media",
  icon: <RiImage2Fill />,
  hint: "Insert an image",
};
