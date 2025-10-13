import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec, useCreateBlockNote } from "@blocknote/react";
import { z } from "zod/v4";

import "./styles.css";

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
    propSchema: defaultProps
      .pick({
        textAlignment: true,
        textColor: true,
      })
      .extend({
        type: z
          .enum(["warning", "error", "info", "success"])
          .default("warning"),
      }),
    content: "inline",
  },
  {
    render: (props) => (
      <div
        className={"alert"}
        style={{
          backgroundColor: alertTypes[props.block.props.type].backgroundColor,
        }}
      >
        <select
          contentEditable={false}
          value={props.block.props.type}
          onChange={(event) => {
            props.editor.updateBlock(props.block, {
              type: "alert",
              props: { type: event.target.value as keyof typeof alertTypes },
            });
          }}
        >
          <option value="warning">{alertTypes["warning"].icon}</option>
          <option value="error">{alertTypes["error"].icon}</option>
          <option value="info">{alertTypes["info"].icon}</option>
          <option value="success">{alertTypes["success"].icon}</option>
        </select>
        <div className={"inline-content"} ref={props.contentRef} />
      </div>
    ),
  },
);

const simpleImageBlock = createReactBlockSpec(
  {
    type: "simpleImage",
    propSchema: z.object({
      src: z
        .string()
        .default(
          "https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg",
        ),
    }),
    content: "none",
  },
  {
    render: (props) => (
      <img
        className={"simple-image"}
        src={props.block.props.src}
        alt="placeholder"
      />
    ),
  },
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
      <div className={"brackets-paragraph"}>
        <div contentEditable={"false"}>{"["}</div>
        <span contentEditable={"false"}>{"{"}</span>
        <div className={"inline-content"} ref={props.contentRef} />
        <span contentEditable={"false"}>{"}"}</span>
        <div contentEditable={"false"}>{"]"}</div>
      </div>
    ),
  },
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: alertBlock(),
    simpleImage: simpleImageBlock(),
    bracketsParagraph: bracketsParagraphBlock(),
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "alert",
        props: {
          type: "success",
        },
        content: "Alert",
      },
      {
        type: "simpleImage",
        props: {
          src: "https://t3.ftcdn.net/jpg/02/48/42/64/360_F_248426448_NVKLywWqArG2ADUxDq6QprtIzsF82dMF.jpg",
        },
      },
      {
        type: "bracketsParagraph",
        content: "Brackets Paragraph",
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
