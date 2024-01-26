import { Menu } from "@mantine/core";

export type SuggestionMenuLabelProps = {
  label: string;
};

export function SuggestionMenuLabel(props: SuggestionMenuLabelProps) {
  return <Menu.Label>{props.label}</Menu.Label>;
}
