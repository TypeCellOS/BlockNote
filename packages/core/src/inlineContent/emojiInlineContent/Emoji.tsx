import { createInlineContentSpec } from "../../schema";

export const Emoji = createInlineContentSpec(
  {
    type: "emoji",
    propSchema: {
      emoji: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props: any) => {
      const dom = document.createElement("span");
      dom.appendChild(document.createTextNode(props.props.emoji));

      return {
        dom,
      };
    },
  }
);
