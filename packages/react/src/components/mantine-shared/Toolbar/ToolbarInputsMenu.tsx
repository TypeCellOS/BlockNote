import { ToolbarButton } from "./ToolbarButton";
import { ReactElement } from "react";
import { Popover, Stack } from "@mantine/core";
import { InputProps } from "./ToolbarInputsMenuItem";

export type ToolbarInputsMenuButtonProps = {
  button: ReactElement<typeof ToolbarButton>;
  dropdownItems:
    | ReactElement<InputProps[keyof InputProps]>
    | Array<ReactElement<InputProps[keyof InputProps]>>;
};

export const ToolbarInputsMenu = (props: ToolbarInputsMenuButtonProps) => (
  <Popover withinPortal={false} zIndex={10000}>
    <Popover.Target>{props.button}</Popover.Target>
    <Popover.Dropdown>
      <Stack className={"bn-toolbar-input-dropdown"}>
        {props.dropdownItems}
      </Stack>
    </Popover.Dropdown>
  </Popover>
);
