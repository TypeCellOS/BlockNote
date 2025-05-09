import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const mention = createInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      user: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (inlineContent) => {
      const mention = document.createElement("span");
      mention.textContent = `@${inlineContent.props.user}`;

      return {
        dom: mention,
      };
    },
  }
);

const tag = createInlineContentSpec(
  {
    type: "tag",
    propSchema: {},
    content: "styled",
  },
  {
    render: () => {
      const tag = document.createElement("span");
      tag.textContent = "#";

      const content = document.createElement("span");
      tag.appendChild(content);

      return {
        dom: tag,
        contentDOM: content,
      };
    },
  }
);

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    mention,
    tag,
    ...defaultInlineContentSpecs,
  },
});

export default function App() {
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
          } as any,
        ],
      },
      {
        type: "paragraph",
        content: [
          "I love ",
          {
            type: "tag",
            content: "BlockNote",
          } as any,
        ],
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
