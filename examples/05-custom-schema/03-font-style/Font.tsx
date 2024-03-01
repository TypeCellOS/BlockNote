import { createReactStyleSpec } from "@blocknote/react";

// The Font style.
export const Font = createReactStyleSpec(
  {
    type: "font",
    propSchema: "string",
  } as const,
  {
    render: (props) => (
      <span style={{ fontFamily: props.value }} ref={props.contentRef} />
    ),
  }
);
