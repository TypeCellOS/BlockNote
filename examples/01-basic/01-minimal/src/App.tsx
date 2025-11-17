import { BlockNoteSchema } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
// Or, you can use ariakit, shadcn, etc.
import { BlockNoteView } from "@blocknote/shadcn";
// Default styles for the mantine editor
import "@blocknote/shadcn/style.css";
// Include the included Inter font
import { defaultProps } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { createReactBlockSpec } from "@blocknote/react";
import React from "react";

function Text() {
  // edit this text & the fast-refresh will break the editor rendering
  return <div>TEST</div>;
}

// The Alert block.
export const createAlert = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      return (
        <div
          className={"alert"}
          data-alert-type={props.block.props.type}
          style={{ backgroundColor: "red" }}
        >
          {/*Icon which opens a menu to choose the Alert type*/}
          Custom Alert Block
          {/*Rich text field for user to type in*/}
          <div className={"inline-content"} ref={props.contentRef} />
        </div>
      );
    },
  },
);

function App() {
  // Create a new editor instance
  const schema = BlockNoteSchema.create().extend({
    blockSpecs: {
      // Creates an instance of the Alert block and adds it to the schema.
      alert: createAlert(),
    },
  });

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "alert",
        content: "This is an example alert",
      },
      {
        type: "paragraph",
        content: "Click the '!' icon to change the alert type",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Render the editor
  return (
    <div>
      <Text></Text>
      <BlockNoteView editor={editor} />
    </div>
  );
}

export default function T() {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
