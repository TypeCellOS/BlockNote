import { createReactStyleSpec, useContent } from "@blocknote/react";

const RenderFont = (props: { value: string }) => {
  const { style, ...rest } = useContent();

  return <span style={{ fontFamily: props.value, ...style }} {...rest} />;
};

// The Font style.
export const Font = createReactStyleSpec(
  {
    type: "font",
    propSchema: "string",
  },
  {
    render: RenderFont,
  }
);
