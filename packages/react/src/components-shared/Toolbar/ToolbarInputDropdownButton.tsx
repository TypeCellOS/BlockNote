import { ToolbarButton } from "./ToolbarButton";
import { ReactElement, useCallback, useState } from "react";
import { ToolbarInputDropdown } from "./ToolbarInputDropdown";
import { Popover } from "@mantine/core";

export type ToolbarInputDropdownButtonProps = {
  children: [
    ReactElement<typeof ToolbarButton>,
    ReactElement<typeof ToolbarInputDropdown>
  ];
};

export const ToolbarInputDropdownButton = (
  props: ToolbarInputDropdownButtonProps
) => {
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
      zIndex={10000}
      {...props}>
      <Popover.Target>{props.children[0]}</Popover.Target>
      <Popover.Dropdown>
        {renderDropdown ? props.children[1] : null}
      </Popover.Dropdown>
    </Popover>
  );
};
