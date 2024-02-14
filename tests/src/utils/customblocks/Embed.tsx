import {
  BlockNoteEditor,
  BlockSchema,
  createBlockSpec,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { MantineSuggestionMenuItemProps } from "@blocknote/react";
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

export const insertEmbed = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  closeMenu: () => void,
  clearQuery: () => void
) =>
  ({
    name: "Insert Embedded Website",
    execute: () => {
      closeMenu();
      clearQuery();

      const src = prompt("Enter website URL");
      editor.insertBlocks(
        [
          {
            type: "embed",
            props: {
              src: src || "https://www.youtube.com/embed/wjfuB8Xjhc4",
            },
          } as PartialBlock<BSchema, I, S>,
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    subtext: "Insert an embedded website",
    icon: <RiLayout5Fill />,
    aliases: ["embedded", "website", "site", "link", "url"],
    group: "Other",
  } satisfies MantineSuggestionMenuItemProps);
