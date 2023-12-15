import { Box } from "@mantine/core";

export const ColorIcon = (
  props: Partial<{
    textColor: string | undefined;
    backgroundColor: string | undefined;
    size: number | undefined;
  }>
) => {
  const textColor = props.textColor || "default";
  const backgroundColor = props.backgroundColor || "default";
  const size = props.size || 16;

  return (
    <Box
      className={"bn-color-icon"}
      data-background-color={backgroundColor}
      data-text-color={textColor}
      style={() => {
        return {
          pointerEvents: "none",
          fontSize: (size * 0.75).toString() + "px",
          height: size.toString() + "px",
          lineHeight: size.toString() + "px",
          textAlign: "center",
          width: size.toString() + "px",
        };
      }}>
      A
    </Box>
  );
};
