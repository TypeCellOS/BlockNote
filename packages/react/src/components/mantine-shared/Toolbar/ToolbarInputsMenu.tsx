import { ToolbarButton } from "./ToolbarButton";
import { ReactElement, useCallback, useState } from "react";
import { Popover, Stack } from "@mantine/core";
import { InputProps } from "./ToolbarInputsMenuItem";

export type ToolbarInputsMenuButtonProps = {
  button: ReactElement<typeof ToolbarButton>;
  dropdownItems:
    | ReactElement<InputProps[keyof InputProps]>
    | Array<ReactElement<InputProps[keyof InputProps]>>;
};

export const ToolbarInputsMenu = (props: ToolbarInputsMenuButtonProps) => {
  const [renderDropdown, setRenderDropdown] = useState<boolean>(false);

  // TODO: review code; does this pattern still make sense?
  //  This is to make autofocus work on the input fields in the dropdown.
  const destroyDropdown = useCallback(() => {
    setRenderDropdown(false);
  }, []);
  const createDropdown = useCallback(() => {
    setRenderDropdown(true);
  }, []);

  return (
    <Popover
      withinPortal={false}
      onOpen={() => {
        createDropdown();
      }}
      onClose={() => {
        destroyDropdown();
      }}
      zIndex={10000}>
      <Popover.Target>{props.button}</Popover.Target>
      <Popover.Dropdown>
        {renderDropdown ? (
          <Stack className={"bn-toolbar-input-dropdown"}>
            {props.dropdownItems}
          </Stack>
        ) : null}
      </Popover.Dropdown>
    </Popover>
  );
};
