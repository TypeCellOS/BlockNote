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
            backgroundColor !== "default"
              ? theme.colors.backgroundColors[
                  theme.other.colorIndex[backgroundColor]
                ]
              : theme.colors.backgroundColors[
                  theme.other.colorIndex["default"]
                ],
          border: "solid #D3D3D3 1px",
          borderRadius: (size * 0.25).toString() + "px",
          color:
            textColor !== "default"
              ? theme.colors.textColors[theme.other.colorIndex[textColor]]
              : theme.colors.textColors[theme.other.colorIndex["default"]],
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
