import { defaultInlineContentSpecs } from "@blocknote/core";
import {
  BlockNoteView,
  createReactInlineContentSpec,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

const mention = createReactInlineContentSpec(
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
    render: (props) => {
      return <span>@{props.inlineContent.props.user}</span>;
    },
  }
);

const tag = createReactInlineContentSpec(
  {
    type: "tag",
    propSchema: {},
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
  }
);

export default function ReactInlineContent() {
  const editor = useBlockNote({
    inlineContentSpecs: {
      mention,
      tag,
      ...defaultInlineContentSpecs,
    },
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
