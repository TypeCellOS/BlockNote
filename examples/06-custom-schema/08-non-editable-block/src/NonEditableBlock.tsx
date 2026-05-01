import { createReactBlockSpec } from "@blocknote/react";

// The Non-Editable block.
export const createNonEditableBlock = createReactBlockSpec(
  {
    type: "nonEditable",
    propSchema: {},
    content: "none",
  },
  {
    render: () => <p>This is a non-editable block.</p>,
  },
);
