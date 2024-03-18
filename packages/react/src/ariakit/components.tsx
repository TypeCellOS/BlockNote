import { ComponentsContextValue } from "../editor/ComponentsContext";
import { Toolbar } from "./Toolbar";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarSelect } from "./ToolbarSelect";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "./menu/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/Popover";

export const ariakitComponents: ComponentsContextValue = {
  Toolbar: Toolbar,
  ToolbarSelect,
  ToolbarButton,
  Menu,
  MenuTarget,
  MenuDropdown,
  MenuDivider,
  MenuLabel,
  MenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
};
