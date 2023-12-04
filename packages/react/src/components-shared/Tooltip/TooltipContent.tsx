import { createStyles, Stack, Text } from "@mantine/core";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Tooltip",
  });

  return (
    <Stack spacing={0} className={classes.root}>
      <Text size={"sm"}>{props.mainTooltip}</Text>
      {props.secondaryTooltip && (
        <Text size={"xs"}>{props.secondaryTooltip}</Text>
      )}
    </Stack>
  );
};
