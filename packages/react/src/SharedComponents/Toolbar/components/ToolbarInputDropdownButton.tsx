import { ToolbarButton } from "./ToolbarButton";
import Tippy from "@tippyjs/react";
import { ReactElement, useCallback, useState } from "react";
import { ToolbarInputDropdown } from "./ToolbarInputDropdown";

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
    <Tippy
      onShow={createDropdown}
      onHidden={destroyDropdown}
      content={renderDropdown ? props.children[1] : null}
      trigger={"click"}
      interactive={true}
      maxWidth={500}>
      {props.children[0]}
    </Tippy>
  );
};
