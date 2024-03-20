import { PopoverDropdown, PopoverTarget } from "@mantine/core";
import { TextInput } from "../components/mantine-shared/Input/TextInput";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "../components/mantine-shared/Menu/Menu";
import { Popover } from "../components/mantine-shared/Popover/Popover";
import { Toolbar } from "../components/mantine-shared/Toolbar/Toolbar";
import { ToolbarButton } from "../components/mantine-shared/Toolbar/ToolbarButton";
import { ToolbarSelect } from "../components/mantine-shared/Toolbar/ToolbarSelect";
import { ComponentsContextValue } from "../editor/ComponentsContext";

export const mantineComponents: ComponentsContextValue = {
  Toolbar,
  ToolbarButton,
  ToolbarSelect,
  Menu,
  MenuTrigger: MenuTarget,
  MenuDropdown,
  MenuDivider,
  MenuLabel,
  MenuItem,
  Popover: Popover,
  PopoverContent: PopoverDropdown,
  PopoverTrigger: PopoverTarget,
  TextInput,
  Form: (props) => <div {...props} />,
};
