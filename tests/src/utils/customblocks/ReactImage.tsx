import { BlockNoteEditor, defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

export const ReactImage = createReactBlockSpec(
  {
    type: "reactImage",
    propSchema: {
      ...defaultProps,
      src: {
        default: "https://via.placeholder.com/1000",
      },
    },
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

export const insertReactImage = {
  title: "Insert React Image",
  onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
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
  subtext: "Insert an image",
  icon: <RiImage2Fill />,
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
};
