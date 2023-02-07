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
      sx={(theme) => {
        return {
          backgroundColor:
            theme.colors.backgroundColors[
              theme.other.colors.indexOf(backgroundColor)
            ],
          border: "solid #D3D3D3 1px",
          borderRadius: (size * 0.25).toString() + "px",
          color: theme.colors.textColors[theme.other.colors.indexOf(textColor)],
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
