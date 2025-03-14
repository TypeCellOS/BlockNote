import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { createReactBlockSpec, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./styles.css";

export const editableBlock = createReactBlockSpec(
  {
    type: "editable",
    content: "inline",
    propSchema: {},
  },
  {
    render: ({ contentRef }) => (
      <div className={"editable-block"}>
        <div className={"editable-block-non-editable-text"}>
          This text is non-editable and is inside an editable block
        </div>
        <div className={"editable-block-editable-text"} ref={contentRef} />
      </div>
    ),
  }
);

export const nonEditableBlock = createReactBlockSpec(
  {
    type: "nonEditable",
    content: "none",
    propSchema: {},
  },
  {
    render: () => (
      <div className={"non-editable-block"}>
        This text is non-editable and is inside a non-editable block
      </div>
    ),
  }
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    editable: editableBlock,
    nonEditable: nonEditableBlock,
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "The block below is editable and contains non-editable text. The non-editable text is not selectable by the user.",
      },
      {
        type: "editable",
        content: "Try selecting the non-editable italic text above.",
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content:
          "The block below is non-editable, and it's text is sometimes selectable by the user.",
      },
      {
        type: "nonEditable",
      },
      {
        type: "paragraph",
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
