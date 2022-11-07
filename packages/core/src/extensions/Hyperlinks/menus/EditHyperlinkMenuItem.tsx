import { IconType } from "react-icons";
import { EditHyperlinkMenuItemIcon } from "./EditHyperlinkMenuItemIcon";
import { EditHyperlinkMenuItemInput } from "./EditHyperlinkMenuItemInput";
import { Group } from "@mantine/core";

export type EditHyperlinkMenuItemProps = {
  icon: IconType;
  mainIconTooltip: string;
  secondaryIconTooltip?: string;
  autofocus?: boolean;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function EditHyperlinkMenuItem(props: EditHyperlinkMenuItemProps) {
  return (
    <Group>
      <EditHyperlinkMenuItemIcon
        icon={props.icon}
        mainTooltip={props.mainIconTooltip}
        secondaryTooltip={props.secondaryIconTooltip}
      />
      <EditHyperlinkMenuItemInput
        autofocus={props.autofocus}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
      />
    </Group>
  );
}
