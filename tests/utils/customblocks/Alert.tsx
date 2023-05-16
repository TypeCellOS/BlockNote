import { createBlockSpec, defaultProps } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
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

export const Alert = createBlockSpec({
  type: "alert" as const,
  propSchema: {
    textAlignment: defaultProps.textAlignment,
    textColor: defaultProps.textColor,
    type: {
      default: "warning",
      values: ["warning", "error", "info", "success"],
    },
  } as const,
  containsInlineContent: true,
  render: (block, editor) => {
    const parent = document.createElement("div");
    parent.setAttribute(
      "style",
      `display: flex; background-color: ${
        values[block().props.type as keyof typeof values].backgroundColor
      }`
    );

    const icon = document.createElement("div");
    icon.innerText = values[block().props.type as keyof typeof values].icon;
    icon.setAttribute("contenteditable", "false");
    icon.setAttribute(
      "style",
      "margin-right: 0.5rem; user-select: none; cursor: pointer;"
    );
    icon.addEventListener("click", () => {
      const type = block().props.type;

      if (type === "warning") {
        parent.setAttribute(
          "style",
          `display: flex; background-color: ${values["error"].backgroundColor}`
        );
        editor.updateBlock(block(), {
          props: {
            type: "error",
          },
        });
      } else if (type === "error") {
        parent.setAttribute(
          "style",
          `display: flex; background-color: ${values["info"].backgroundColor}`
        );
        editor.updateBlock(block(), {
          props: {
            type: "info",
          },
        });
      } else if (type === "info") {
        parent.setAttribute(
          "style",
          `display: flex; background-color: ${values["success"].backgroundColor}`
        );
        editor.updateBlock(block(), {
          props: {
            type: "success",
          },
        });
      } else if (type === "success") {
        parent.setAttribute(
          "style",
          `display: flex; background-color: ${values["warning"].backgroundColor}`
        );
        editor.updateBlock(block(), {
          props: {
            type: "warning",
          },
        });
      } else {
        throw new Error("Unknown alert type");
      }
    });

    const text = document.createElement("div");

    parent.appendChild(icon);
    parent.appendChild(text);

    return {
      dom: parent,
      contentDOM: text,
    };
  },
});

export const insertAlert = new ReactSlashMenuItem<{
  alert: typeof Alert;
}>(
  "Insert Alert",
  (editor) => {
    editor.insertBlocks(
      [
        {
          type: "alert",
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  ["alert", "notification", "emphasize", "warning", "error", "info", "success"],
  "Media",
  <RiAlertFill />,
  "Insert an alert block to emphasize text"
);
