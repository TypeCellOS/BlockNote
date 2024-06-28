import { createInlineContentSpec } from "../schema";
 

export const Emoji = createInlineContentSpec(
  //STEP 4: this component recieves an emoji, and insets it in the line
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
 