import { ToolbarButton } from "./ToolbarButton";
import Tippy, { TippyProps } from "@tippyjs/react";
import { ReactElement, useCallback, useState } from "react";
import { ToolbarInputDropdown } from "./ToolbarInputDropdown";

export type ToolbarInputDropdownButtonProps = {
  children: [
    ReactElement<typeof ToolbarButton>,
    ReactElement<typeof ToolbarInputDropdown>
  ];
};

export const ToolbarInputDropdownButton = (
  props: ToolbarInputDropdownButtonProps &
    Omit<Partial<TippyProps>, "content" | "children">
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
      onShow={(instance) => {
        createDropdown();
        props.onShow?.(instance);
      }}
      onHidden={(instance) => {
        destroyDropdown();
        props.onShow?.(instance);
      }}
      content={renderDropdown ? props.children[1] : null}
      trigger={props.visible === undefined ? "click" : undefined}
      interactive={true}
      maxWidth={500}
      zIndex={9000}
      {...props}>
      {props.children[0]}
    </Tippy>
  );
};
