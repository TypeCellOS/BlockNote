import "@blocknote/core/style.css";
import {
  BlockNoteView,
  createReactInlineContentSpec,
  InlineEditable,
  useBlockNote,
} from "@blocknote/react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

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
    render: () => {
      return (
        <span>
          <span contentEditable={false}>#</span>
          <InlineEditable />
        </span>
      );
    },
  }
);

export function ReactInlineContent() {
  const editor = useBlockNote({
    inlineContentSpecs: {
      mention,
      tag,
    },
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
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
            // props: {},
            content: "BlockNote",
          } as any,
        ],
      },
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView className="root" editor={editor} />;
}
