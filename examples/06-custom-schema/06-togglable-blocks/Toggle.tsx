import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec, ToggleWrapper } from "@blocknote/react";

// The Toggle block that we want to add to our editor.
export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggle",
    propSchema: {
      ...defaultProps,
      // We add an `isTogglable` prop which defaults to true. Otherwise, the
      // `ToggleWrapper` component will only render its children.
      isTogglable: { default: true },
    },
    content: "inline",
  },
  {
    render: (props) => (
      // The `ToggleWrapper` component checks if the block has the
      // `isTogglable` prop set to true. It then renders a button on the left
      // which toggles the visibility of the block's children. It also adds
      // a button to add child blocks if there are none.
      <ToggleWrapper block={props.block} editor={props.editor}>
        <p ref={props.contentRef} />
      </ToggleWrapper>
    ),
  },
);
