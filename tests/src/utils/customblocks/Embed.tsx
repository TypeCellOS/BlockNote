import { BlockSchemaWithBlock, createBlockSpec } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiLayout5Fill } from "react-icons/ri";

export const Embed = createBlockSpec(
  {
    type: "embed" as const,
    propSchema: {
      src: {
        default: "https://www.youtube.com/embed/wjfuB8Xjhc4",
      },
    } as const,
    content: "none",
  },
  {
    render: (block) => {
      const embed = document.createElement("iframe");
      embed.setAttribute("src", block.props.src);
      embed.setAttribute("contenteditable", "false");
      embed.setAttribute("border", "1px solid black");
      embed.setAttribute("width", "500px");
      embed.setAttribute("height", "300px");

      return {
        dom: embed,
      };
    },
  }
);

export const insertEmbed: ReactSlashMenuItem<
  BlockSchemaWithBlock<"embed", typeof Embed.config>,
  any,
  any
> = {
  name: "Insert Embedded Website",
  execute: (editor) => {
    const src = prompt("Enter website URL");
    editor.insertBlocks(
      [
        {
          type: "embed",
          props: {
            src: src || "https://www.youtube.com/embed/wjfuB8Xjhc4",
          },
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  aliases: ["embedded", "website", "site", "link", "url"],
  group: "Media",
  icon: <RiLayout5Fill />,
  hint: "Insert an embedded website",
};
