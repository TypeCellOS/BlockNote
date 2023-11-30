import { defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  createReactBlockSpec,
  useBlockNote,
} from "@blocknote/react";
import {
  alertConfig,
  alertStyles,
  alertTypes,
  bracketsParagraphConfig,
  bracketsParagraphStyles,
  inlineContentStyles,
} from "./Blocks";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

export const alertBlock = createReactBlockSpec(alertConfig, {
  render: (props) => (
    <div
      style={{
        ...alertStyles,
        backgroundColor: alertTypes[props.block.props.type].backgroundColor,
      }}>
      <select
        contentEditable={false}
        value={props.block.props.type}
        onChange={(event) => {
          // TODO: Typing issue here also
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
      <div style={inlineContentStyles} ref={props.contentRef} />
    </div>
  ),
});

export const bracketsParagraphBlock = createReactBlockSpec(
  bracketsParagraphConfig,
  {
    render: (props) => (
      <div style={bracketsParagraphStyles}>
        <div contentEditable={"false"}>{"["}</div>
        <span contentEditable={"false"}>{"{"}</span>
        <div style={inlineContentStyles} ref={props.contentRef} />
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
