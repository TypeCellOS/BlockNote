import { Button } from "@mantine/core";
import { MouseEventHandler, forwardRef } from "react";
import type { IconType } from "react-icons";
import { HiChevronDown } from "react-icons/hi";

export type ToolbarDropdownTargetProps = {
  text: string;
  icon?: IconType;
  isDisabled?: boolean;
  onClick?: MouseEventHandler;
};

export const ToolbarDropdownTarget = forwardRef<
  HTMLButtonElement,
  ToolbarDropdownTargetProps
>((props: ToolbarDropdownTargetProps, ref) => {
  const TargetIcon = props.icon;

  return (
    <Button
      // Needed as Safari doesn't focus button elements on mouse down
      // unlike other browsers.
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).focus();
      }}
      leftSection={TargetIcon && <TargetIcon size={16} />}
      rightSection={<HiChevronDown />}
      size={"xs"}
      variant={"subtle"}
      disabled={props.isDisabled}
      onClick={props.onClick}
      ref={ref}>
      {props.text}
    </Button>
  );
});
