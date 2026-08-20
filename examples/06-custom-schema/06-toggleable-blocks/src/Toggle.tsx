import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

// The Toggle block that we want to add to our editor.
export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggle",
    propSchema: {
      ...defaultProps,
    },
    content: "inline",
  },
  {
    // `meta.collapsible` is all it takes: `CollapsibleExtension` adds the
    // chevron that hides the block's children, and remembers the state per
    // block ID in local storage.
    meta: {
      collapsible: true,
    },
    render: (props) => <p ref={props.contentRef} />,
  },
);
