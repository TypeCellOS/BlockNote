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

const mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: createPropSchemaFromZod(
      z.object({
        user: z.string().default(""),
      }),
    ),
    content: "none",
  },
  {
    render: (props) => {
      return <span>@{props.inlineContent.props.user}</span>;
    },
  },
);

const tag = createReactInlineContentSpec(
  {
    type: "tag",
    propSchema: createPropSchemaFromZod(z.object({})),
    content: "styled",
  },
  {
    render: (props) => {
      return (
        <span>
          #<span ref={props.contentRef}></span>
        </span>
      );
    },
  },
);

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    mention,
    tag,
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
            type: "mention",
            props: {
              user: "Matthew",
            },
            content: undefined,
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          "I love ",
          {
            type: "tag",
            content: "BlockNote",
          },
        ],
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
