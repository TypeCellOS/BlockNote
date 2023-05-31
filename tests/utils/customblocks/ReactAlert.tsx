import { defaultProps } from "@blocknote/core";
import {
  createReactBlockSpec,
  InlineContent,
  ReactSlashMenuItem,
} from "@blocknote/react";
import React, { useState } from "react";
import { RiAlertFill } from "react-icons/ri";

const values = {
  warning: {
    icon: "⚠️",
    backgroundColor: "#fbf3db",
  },
  error: {
    icon: "❌",
    backgroundColor: "#fbe4e4",
  },
  info: {
    icon: "ℹ️",
    backgroundColor: "#ddebf1",
  },
  success: {
    icon: "✅",
    backgroundColor: "#ddedea",
  },
} as const;

export const ReactAlert = createReactBlockSpec({
  type: "reactAlert" as const,
  propSchema: {
    textAlignment: defaultProps.textAlignment,
    textColor: defaultProps.textColor,
    type: {
      default: "warning",
      values: ["warning", "error", "info", "success"],
    },
  } as const,
  containsInlineContent: true,
  render: (props) => {
    const [type, setType] = useState(props.block.props.type);

    React.useEffect(() => {
      console.log("ReactAlert initialize");
      return () => {
        console.log(" ReactAlert cleanup");
      };
    }, []);

    console.log("ReactAlert render");

    // Tests to see if types are correct:

    let test: "reactAlert" = props.block.type;
    console.log(test);

    // @ts-expect-error
    let test1: "othertype" = props.block.type;
    console.log(test1);

    return (
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          backgroundColor: values[type as keyof typeof values].backgroundColor,
        }}>
        <div
          style={{
            marginRight: "0.5rem",
            userSelect: "none",
            cursor: "pointer",
          }}
          contentEditable={false}
          onClick={() => {
            if (type === "warning") {
              props.editor.updateBlock(props.block, {
                props: {
                  type: "error",
                },
              });
              setType("error");
            } else if (type === "error") {
              props.editor.updateBlock(props.block, {
                props: {
                  type: "info",
                },
              });
              setType("info");
            } else if (type === "info") {
              props.editor.updateBlock(props.block, {
                props: {
                  type: "success",
                },
              });
              setType("success");
            } else if (type === "success") {
              props.editor.updateBlock(props.block, {
                props: {
                  type: "warning",
                },
              });
              setType("warning");
            } else {
              throw new Error("Unknown alert type");
            }
          }}>
          {values[type as keyof typeof values].icon}
        </div>
        <InlineContent />
      </div>
    );
  },
});
export const insertReactAlert = new ReactSlashMenuItem<{
  reactAlert: typeof ReactAlert;
}>(
  "Insert React Alert",
  (editor) => {
    editor.insertBlocks(
      [
        {
          type: "reactAlert",
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  [
    "react",
    "reactAlert",
    "react alert",
    "alert",
    "notification",
    "emphasize",
    "warning",
    "error",
    "info",
    "success",
  ],
  "Media",
  <RiAlertFill />,
  "Insert an alert block to emphasize text"
);
