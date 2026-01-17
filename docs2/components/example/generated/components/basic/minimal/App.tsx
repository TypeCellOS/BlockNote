import { BlockNoteSchema, defaultProps } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec, useCreateBlockNote } from "@blocknote/react";
import { startTransition, useEffect, useState } from "react";

function Text() {
  // edit this text & the fast-refresh will break the editor rendering
  return <div>tsdfsdfsdfsdfsdfdfedfr</div>;
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

export default function App() {
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
      <ChaosRerender />
    </div>
  );
}

function ChaosRerender() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => {
        setTick((t) => t + 1);
      });
    }, 0);
    return () => clearInterval(id);
  }, []);

  return null;
}

// export default function T() {
//   return (
//     <React.StrictMode>
//       <App />
//     </React.StrictMode>
//   );
// }
