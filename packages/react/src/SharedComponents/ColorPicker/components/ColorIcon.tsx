import { Box, createStyles } from "@mantine/core";

export const ColorIcon = (
  props: Partial<{
    textColor: string | undefined;
    backgroundColor: string | undefined;
    size: number | undefined;
  }>
) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "ColorIcon",
  });

  const textColor = props.textColor || "default";
  const backgroundColor = props.backgroundColor || "default";
  const size = props.size || 16;

  return (
    <Box
      className={classes.root}
      sx={(theme) => {
        return {
          pointerEvents: "none",
          backgroundColor: theme.other.backgroundColors[backgroundColor],
          color: theme.other.textColors[textColor],
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
