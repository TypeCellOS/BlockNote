import { createBlockSpec, defaultProps } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

export const Image = createBlockSpec({
  type: "image" as const,
  propSchema: {
    ...defaultProps,
    src: {
      default: "https://via.placeholder.com/150",
    },
  } as const,
  containsInlineContent: true,
  render: (block) => {
    const image = document.createElement("img");
    image.setAttribute("src", block.props.src);
    image.setAttribute("contenteditable", "false");
    image.setAttribute("border", "1px solid black");

    const caption = document.createElement("div");

    const parent = document.createElement("div");
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
            src: src || "https://via.placeholder.com/150",
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
