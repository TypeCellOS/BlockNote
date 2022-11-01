import { Button } from "@mantine/core";
import { HiChevronDown } from "react-icons/hi";
import { IconType } from "react-icons";
import useStyles from "./ToolbarDropdownTarget.styles";
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
  const { classes } = useStyles(undefined, { name: "ToolbarDropdownTarget" });
  const { text, icon, isDisabled, ...others } = props;

  const TargetIcon = props.icon;
  return (
    <Button
      classNames={{
        icon: classes.icon,
        inner: classes.inner,
        label: classes.label,
        leftIcon: classes.leftIcon,
        rightIcon: classes.rightIcon,
        root: classes.root,
      }}
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
