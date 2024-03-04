import { Stack, Text } from "@mantine/core";

export const TooltipContent = (props: {
  mainTooltip: string;
  secondaryTooltip?: string;
}) => (
  <Stack gap={0} className={"bn-tooltip"}>
    <Text size={"sm"}>{props.mainTooltip}</Text>
    {props.secondaryTooltip && (
      <Text size={"xs"}>{props.secondaryTooltip}</Text>
    )}
  </Stack>
);
