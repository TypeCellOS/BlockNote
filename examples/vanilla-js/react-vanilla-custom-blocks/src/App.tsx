import {
  BlockNoteSchema,
  createBlockSpec,
  defaultBlockSpecs,
  defaultProps,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

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

const alertBlock = createBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"] as const,
      },
    },
    content: "inline",
  },
  {
    render: (block, editor) => {
      const alert = document.createElement("div");
      alert.className = "alert";
      alert.style.backgroundColor =
        alertTypes[block.props.type].backgroundColor;

      const dropdown = document.createElement("select");
      dropdown.contentEditable = "false";
      dropdown.addEventListener("change", () => {
        editor.updateBlock(block, {
          type: "alert",
          props: { type: dropdown.value as keyof typeof alertTypes },
        });
      });
      dropdown.options.add(
        new Option(
          alertTypes["warning"].icon,
          "warning",
          block.props.type === "warning",
          block.props.type === "warning"
        )
      );
      dropdown.options.add(
        new Option(
          alertTypes["error"].icon,
          "error",
          block.props.type === "error",
          block.props.type === "error"
        )
      );
      dropdown.options.add(
        new Option(
          alertTypes["info"].icon,
          "info",
          block.props.type === "info",
          block.props.type === "info"
        )
      );
      dropdown.options.add(
        new Option(
          alertTypes["success"].icon,
          "success",
          block.props.type === "success",
          block.props.type === "success"
        )
      );
      alert.appendChild(dropdown);

      const inlineContent = document.createElement("div");
      inlineContent.style.flexGrow = "1";

      alert.appendChild(inlineContent);

      return {
        dom: alert,
        contentDOM: inlineContent,
      };
    },
  }
);

const simpleImageBlock = createBlockSpec(
  {
    type: "simpleImage",
    propSchema: {
      src: {
        default:
          "https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg",
      },
    },
    content: "none",
  },
  {
    render: (block) => {
      const image = document.createElement("img");
      image.className = "simple-image";
      image.src = block.props.src;
      image.alt = "placeholder";

      return {
        dom: image,
      };
    },
  }
);

const bracketsParagraphBlock = createBlockSpec(
  {
    type: "bracketsParagraph",
    content: "inline",
    propSchema: {
      ...defaultProps,
    },
  },
  {
    render: () => {
      const bracketsParagraph = document.createElement("div");
      bracketsParagraph.className = "brackets-paragraph";

      const leftBracket = document.createElement("div");
      leftBracket.contentEditable = "false";
      leftBracket.innerText = "[";
      bracketsParagraph.appendChild(leftBracket);
      const leftCurlyBracket = document.createElement("span");
      leftCurlyBracket.contentEditable = "false";
      leftCurlyBracket.innerText = "{";
      bracketsParagraph.appendChild(leftCurlyBracket);

      const inlineContent = document.createElement("div");
      inlineContent.className = "inline-content";

      bracketsParagraph.appendChild(inlineContent);

      const rightCurlyBracket = document.createElement("span");
      rightCurlyBracket.contentEditable = "false";
      rightCurlyBracket.innerText = "}";
      bracketsParagraph.appendChild(rightCurlyBracket);
      const rightBracket = document.createElement("div");
      rightBracket.contentEditable = "false";
      rightBracket.innerText = "]";
      bracketsParagraph.appendChild(rightBracket);

      return {
        dom: bracketsParagraph,
        contentDOM: inlineContent,
      };
    },
  }
);
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: alertBlock,
    bracketsParagraph: bracketsParagraphBlock,
    simpleImage: simpleImageBlock,
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
        content: ["Alert"],
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
