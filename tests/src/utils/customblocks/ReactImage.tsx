import { BlockSchemaWithBlock, defaultProps } from "@blocknote/core";
import { ReactSlashMenuItem, createReactBlockSpec } from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

export const ReactImage = createReactBlockSpec(
  {
    type: "reactImage" as const,
    propSchema: {
      ...defaultProps,
      src: {
        default: "https://via.placeholder.com/1000",
      },
    } as const,
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}>
          <img
            style={{
              width: "100%",
            }}
            src={block.props.src}
            alt={"test"}
            contentEditable={false}
          />
          <span ref={contentRef} style={{ flexGrow: 1 }} />
        </div>
      );
    },
  }
);

export const insertReactImage: ReactSlashMenuItem<
  BlockSchemaWithBlock<"reactImage", typeof ReactImage.config>
> = {
  name: "Insert React Image",
  execute: (editor) => {
    const src = prompt("Enter image URL") || "https://via.placeholder.com/1000";
    editor.insertBlocks(
      [
        {
          type: "reactImage",
          props: {
            src,
          },
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  aliases: [
    "react",
    "reactImage",
    "react image",
    "image",
    "img",
    "picture",
    "media",
  ],
  group: "Media",
  icon: <RiImage2Fill />,
  hint: "Insert an image",
};
