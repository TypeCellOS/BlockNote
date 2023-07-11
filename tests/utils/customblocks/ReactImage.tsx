import { z } from "zod";
import React from "react";
import {
  InlineContent,
  createReactBlockSpec,
  ReactSlashMenuItem,
} from "@blocknote/react";
import { defaultProps, defaultPropSchema } from "@blocknote/core";
import { RiImage2Fill } from "react-icons/ri";

export const ReactImage = createReactBlockSpec({
  type: "reactImage" as const,
  propSchema: defaultPropSchema.merge(z.object({
    src: z.string().url(),
  })),
  props: {
    ...defaultProps,
    src: "https://via.placeholder.com/1000"
  } as const,
  containsInlineContent: true,
  render: ({ block }) => {
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
          alt={"Image"}
          contentEditable={false}
        />
        <InlineContent />
      </div>
    );
  },
});

export const insertReactImage = new ReactSlashMenuItem<{
  reactImage: typeof ReactImage;
}>(
  "Insert React Image",
  (editor) => {
    const src = prompt("Enter image URL");
    editor.insertBlocks(
      [
        {
          type: "reactImage",
          props: {
            src: src || "https://via.placeholder.com/1000",
          },
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  ["react", "reactImage", "react image", "image", "img", "picture", "media"],
  "Media",
  <RiImage2Fill />,
  "Insert an image"
);
