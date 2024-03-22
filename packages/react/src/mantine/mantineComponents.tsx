import { Loader, PopoverDropdown, PopoverTarget } from "@mantine/core";
import { ComponentsContextValue } from "../editor/ComponentsContext";
import { TextInput } from "./input/TextInput";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "./menu/Menu";
import { Popover } from "./popover/Popover";
import { Toolbar } from "./toolbar/Toolbar";
import { ToolbarButton } from "./toolbar/ToolbarButton";
import { ToolbarSelect } from "./toolbar/ToolbarSelect";

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
  SuggestionMenuLoader: () => (
    <Loader className={"bn-slash-menu-loader"} type="dots" />
  ),
};
