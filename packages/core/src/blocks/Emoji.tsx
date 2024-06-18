import { createReactInlineContentSpec } from "@blocknote/react";
 

export const Emoji = createReactInlineContentSpec(
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
 