import { Button } from "@mantine/core";
import { MouseEventHandler, forwardRef, useRef } from "react";
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const TargetIcon = props.icon;

  return (
    <Button
      // Needed as Safari doesn't focus button elements on mouse down
      // unlike other browsers.
      onMouseDown={() => {
        if (buttonRef.current !== null) {
          buttonRef.current.focus();
        }
      }}
      leftSection={TargetIcon && <TargetIcon size={16} />}
      rightSection={<HiChevronDown />}
      size={"xs"}
      variant={"subtle"}
      disabled={props.isDisabled}
      onClick={props.onClick}
      // TODO: Ugly code for combining refs
      ref={(node) => {
        buttonRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}>
      {props.text}
    </Button>
  );
});
