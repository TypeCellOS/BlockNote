import {
  BlockConfig,
  BlockNoteEditor,
  DefaultInlineContentSchema,
  defaultProps,
  DefaultStyleSchema,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
  useContent,
} from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

const reactImageConfig = {
  type: "reactImage",
  propSchema: {
    ...defaultProps,
    src: {
      default: "https://via.placeholder.com/1000",
    },
  },
  content: "inline",
} satisfies BlockConfig;

const RenderReactImage = (
  props: ReactCustomBlockRenderProps<
    typeof reactImageConfig,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  >
) => {
  const { style, ...rest } = useContent();

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <img
        style={{ width: "100%" }}
        src={props.block.props.src}
        alt={"test"}
        contentEditable={false}
      />
      <span style={{ flexGrow: 1, ...style }} {...rest} />
    </div>
  );
};

export const ReactImage = createReactBlockSpec(reactImageConfig, {
  render: RenderReactImage,
});

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
