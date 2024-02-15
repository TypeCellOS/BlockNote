import {
  BlockNoteEditor,
  BlockSchema,
  defaultProps,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  MantineSuggestionMenuItemProps,
} from "@blocknote/react";
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

export const insertReactImage = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  closeMenu: () => void,
  clearQuery: () => void
) =>
  ({
    name: "Insert React Image",
    execute: () => {
      closeMenu();
      clearQuery();

      const src =
        prompt("Enter image URL") || "https://via.placeholder.com/1000";
      editor.insertBlocks(
        [
          {
            type: "reactImage",
            props: {
              src,
            },
          } as PartialBlock<BSchema, I, S>,
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
  } satisfies MantineSuggestionMenuItemProps);
