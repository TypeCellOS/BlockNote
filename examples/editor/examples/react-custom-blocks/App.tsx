import { defaultBlockSpecs, defaultProps } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  createReactBlockSpec,
  useBlockNote,
} from "@blocknote/react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

// The types of alerts that users can choose from
const alertTypes = {
  warning: {
    icon: "⚠️",
    color: "#e69819",
    backgroundColor: "#fff6e6",
  },
  error: {
    icon: "⛔",
    color: "#d80d0d",
    backgroundColor: "#ffe6e6",
  },
  info: {
    icon: "ℹ️",
    color: "#507aff",
    backgroundColor: "#e6ebff",
  },
  success: {
    icon: "✅",
    color: "#0bc10b",
    backgroundColor: "#e6ffe6",
  },
};

export const alertBlock = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning" as const,
        values: ["warning", "error", "info", "success"] as const,
      },
    },
    content: "inline",
  },
  {
    render: (props) => (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexGrow: "1",
          height: "48px",
          padding: "4px",
          maxWidth: "100%",
          backgroundColor: alertTypes[props.block.props.type].backgroundColor,
        }}>
        <select
          contentEditable={false}
          value={props.block.props.type}
          onChange={(event) => {
            props.editor.updateBlock(props.block, {
              type: "alert",
              props: { type: event.target.value as keyof typeof alertTypes },
            });
          }}>
          <option value="warning">{alertTypes["warning"].icon}</option>
          <option value="error">{alertTypes["error"].icon}</option>
          <option value="info">{alertTypes["info"].icon}</option>
          <option value="success">{alertTypes["success"].icon}</option>
        </select>
        <div style={{ flexGrow: 1 }} ref={props.contentRef} />
      </div>
    ),
  }
);

export const bracketsParagraphBlock = createReactBlockSpec(
  {
    type: "bracketsParagraph",
    content: "inline",
    propSchema: {
      ...defaultProps,
    },
  },
  {
    render: (props) => (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexGrow: "1",
          height: "48px",
          padding: "4px",
          maxWidth: "100%",
        }}>
        <div contentEditable={"false"}>{"["}</div>
        <span contentEditable={"false"}>{"{"}</span>
        <div style={{ flexGrow: 1 }} ref={props.contentRef} />
        <span contentEditable={"false"}>{"}"}</span>
        <div contentEditable={"false"}>{"]"}</div>
      </div>
    ),
  }
);

export function ReactCustomBlocks() {
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    blockSpecs: {
      ...defaultBlockSpecs,
      alert: alertBlock,
      bracketsParagraph: bracketsParagraphBlock,
    },
    initialContent: [
      {
        type: "alert",
        props: {
          type: "success",
        },
        content: "Alert",
      },
      {
        type: "bracketsParagraph",
        content: "Brackets Paragraph",
      },
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView className="root" editor={editor} />;
}
