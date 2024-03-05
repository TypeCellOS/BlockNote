import {
  Block,
  BlockSchemaWithBlock,
  createBlockSpec,
  InlineContent,
} from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiLayout5Fill } from "react-icons/ri";

function inlineContentToText(inlineContent: InlineContent<any, any>[]) {
  return inlineContent.reduce((string, content) => {
    if (content.type === "link") {
      return (
        string +
        content.content.reduce((string, content) => {
          return string + content.text;
        }, "")
      );
    }

    return string + content.text;
  }, "");
}

function createHeadingElements(block: Block<any, any, any>) {
  const heading: HTMLElement = document.createElement("li");
  const text = document.createElement("p");
  text.innerText = inlineContentToText(block.content);
  heading.appendChild(text);

  const subheadings: HTMLElement = document.createElement("ol");

  for (const child of block.children) {
    subheadings.appendChild(createHeadingElements(child));
  }

  if (block.children.length > 0) {
    heading.appendChild(subheadings);
  }

  return heading;
}

export const TableOfContents = createBlockSpec(
  {
    type: "toc" as const,
    propSchema: {} as const,
    content: "none",
  },
  {
    render: (_, editor) => {
      const toc = document.createElement("ol");

      editor.onEditorContentChange(() => {
        toc.innerHTML = "";
        for (const block of editor.topLevelBlocks) {
          if (block.type === "heading") {
            toc.appendChild(createHeadingElements(block));
          }
        }
      });

      return {
        dom: toc,
      };
    },
  }
);

export const insertTableOfContents: ReactSlashMenuItem<
  BlockSchemaWithBlock<"toc", typeof TableOfContents.config>
> = {
  name: "Insert Separator",
  execute: (editor) => {
    editor.insertBlocks(
      [
        {
          type: "toc",
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },

  aliases: ["toc", "table", "contents", "navigation", "headings"],
  group: "Media",
  icon: <RiLayout5Fill />,
  hint: "Insert a table of contents",
};
