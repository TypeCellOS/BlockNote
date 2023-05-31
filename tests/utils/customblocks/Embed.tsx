import { createBlockSpec } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiLayout5Fill } from "react-icons/ri";

export const Embed = createBlockSpec({
  type: "embed" as const,
  propSchema: {
    src: {
      default: "https://www.youtube.com/embed/wjfuB8Xjhc4",
    },
  } as const,
  containsInlineContent: false,
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
});

export const insertEmbed = new ReactSlashMenuItem<{
  embed: typeof Embed;
}>(
  "Insert Embedded Website",
  (editor) => {
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
  ["embedded", "website", "site", "link", "url"],
  "Media",
  <RiLayout5Fill />,
  "Insert an embedded website"
);
