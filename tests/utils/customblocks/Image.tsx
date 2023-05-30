import { createBlockSpec, defaultProps } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

export const Image = createBlockSpec({
  type: "image" as const,
  propSchema: {
    ...defaultProps,
    src: {
      default: "https://via.placeholder.com/1000",
    },
  } as const,
  containsInlineContent: true,
  render: (block) => {
    const image = document.createElement("img");
    image.setAttribute("src", block.props.src);
    image.setAttribute("contenteditable", "false");
    image.setAttribute("style", "width: 100%");

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
});

export const insertImage = new ReactSlashMenuItem<{
  image: typeof Image;
}>(
  "Insert Image",
  (editor) => {
    const src = prompt("Enter image URL");
    editor.insertBlocks(
      [
        {
          type: "image",
          props: {
            src: src || "https://via.placeholder.com/1000",
          },
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  ["image", "img", "picture", "media"],
  "Media",
  <RiImage2Fill />,
  "Insert an image"
);
