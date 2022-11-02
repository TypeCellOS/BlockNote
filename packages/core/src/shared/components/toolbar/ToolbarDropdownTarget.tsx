import { Button } from "@mantine/core";
import { HiChevronDown } from "react-icons/hi";
import { IconType } from "react-icons";
import { forwardRef } from "react";

export type ToolbarDropdownTargetProps = {
  text: string;
  icon?: IconType;
  isDisabled?: boolean;
};

export const ToolbarDropdownTarget = forwardRef<
  HTMLButtonElement,
  ToolbarDropdownTargetProps
>((props: ToolbarDropdownTargetProps, ref) => {
  const { text, icon, isDisabled, ...others } = props;

  const TargetIcon = props.icon;
  return (
    <Button
      leftIcon={TargetIcon && <TargetIcon size={16} />}
      rightIcon={<HiChevronDown />}
      size={"xs"}
      variant={"subtle"}
      disabled={props.isDisabled}
      ref={ref}
      {...others}>
      {props.text}
    </Button>
  );
});
