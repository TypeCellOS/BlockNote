import { ComponentProps } from "@blocknote/react";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export const Menu = (props: ComponentProps["Generic"]["Menu"]["Root"]) => {
  const { sub, position, ...rest } = props;

  if (sub) {
    return <DropdownMenuSub {...rest} />;
  } else {
    // return <DropdownMenuDemo />;
    return <DropdownMenu {...rest} />;
  }
};

export const MenuTrigger = (
  props: ComponentProps["Generic"]["Menu"]["Trigger"]
) => {
  const { sub, ...rest } = props;

  if (sub) {
    return <DropdownMenuSubTrigger {...rest} />;
  } else {
    return <DropdownMenuTrigger {...rest} />;
  }
};

export const MenuDropdown = (
  props: ComponentProps["Generic"]["Menu"]["Dropdown"]
) => {
  const { sub, ...rest } = props;

  if (sub) {
    return <DropdownMenuSubContent {...rest} />;
  } else {
    return <DropdownMenuContent {...rest} />;
  }
};

export const MenuItem = (props: ComponentProps["Generic"]["Menu"]["Item"]) => {
  // TODO: implement icon
  const { icon, children, ...rest } = props;

  if (props.checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem {...rest}>
        {props.icon}
        {props.children}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem {...rest}>
      {props.icon}
      {props.children}
      {props.subTrigger && <ChevronRight className="ml-auto h-4 w-4" />}
    </DropdownMenuItem>
  );
};

export const MenuDivider = (
  props: ComponentProps["Generic"]["Menu"]["Divider"]
) => <DropdownMenuSeparator {...props} />;
export const MenuLabel = DropdownMenuLabel;
