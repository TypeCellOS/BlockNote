import { createReactInlineContentSpec } from "@blocknote/react";
 

export const Emoji = createReactInlineContentSpec(
  //STEP 4: this component recieves an emoji, and insets it in the line
  {
    type: "emoji",
    propSchema: {
      emoji: {
        default: "Unknown",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      return(
      
      <span >
        {props.inlineContent.props.emoji}
      </span>
    )},
  }
);
 