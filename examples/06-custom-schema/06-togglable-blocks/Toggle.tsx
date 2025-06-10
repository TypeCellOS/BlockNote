import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec, ToggleWrapper } from "@blocknote/react";

export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggle",
    propSchema: {
      ...defaultProps,
    },
    content: "inline",
  },
  {
    render: (props) => (
      <ToggleWrapper block={props.block} editor={props.editor}>
        <p ref={props.contentRef} />
      </ToggleWrapper>
    ),
  },
);
