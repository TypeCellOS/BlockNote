import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  createReactInlineContentSpec,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const draggableButton = createReactInlineContentSpec(
  {
    type: "draggableButton",
    propSchema: {
      title: {
        default: "",
      },
    },
    content: "none",
  },
  {
    meta: {
      draggable: true,
    },
    render: (props) => {
      return (
        <span
          style={{
            border: "none",
            background: "blue",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "move",
          }}
          data-drag-handle
        >
          <span>{props.inlineContent.props.title}</span>
        </span>
      );
    },
  },
);

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    draggableButton,
    ...defaultInlineContentSpecs,
  },
});

export default function ReactInlineContent() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: [
          "I enjoy working with ",
          {
            type: "draggableButton",
            props: {
              title: "Hector",
            },
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          "I love ",
          {
            type: "draggableButton",
            props: {
              title: "BlockNote",
            },
          },
        ],
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
