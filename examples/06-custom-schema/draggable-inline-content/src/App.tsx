import {
  BlockNoteSchema,
  createPropSchemaFromZod,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactInlineContentSpec,
  useCreateBlockNote,
} from "@blocknote/react";
import { z } from "zod/v4";

const draggableButton = createReactInlineContentSpec(
  {
    type: "draggableButton",
    propSchema: createPropSchemaFromZod(
      z.object({
        title: z.string().default(""),
      }),
    ),
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
