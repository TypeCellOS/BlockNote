import { Badge, Group, Stack, Text } from "@mantine/core";

export type SlashMenuItemProps = {
  name: string;
  icon: JSX.Element;
  hint: string | undefined;
  shortcut?: string;
};

export function SlashMenuItem(props: SlashMenuItemProps) {
  return (
    <Group className={"bn-slash-menu-item"}>
      {props.icon}
      <Stack className={"bn-slash-menu-item-text"}>
        {/*Might need separate classes.*/}
        <Text lh={"20px"} size={"14px"} fw={500}>
          {props.name}
        </Text>
        <Text lh={"16px"} size={"10px"}>
          {props.hint}
        </Text>
      </Stack>
      {props.shortcut && <Badge size={"xs"}>{props.shortcut}</Badge>}
    </Group>
  );
}
