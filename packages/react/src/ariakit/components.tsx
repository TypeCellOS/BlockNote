import { ComponentsContextValue } from "../editor/ComponentsContext";
import { Toolbar } from "./Toolbar";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarSelect } from "./ToolbarSelect";
import { Form } from "./input/Form";
import { TextInput } from "./input/TextInput";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/Popover";

export const ariakitComponents: ComponentsContextValue = {
  Form,
  TextInput,
  Toolbar: Toolbar,
  ToolbarSelect,
  ToolbarButton,
  Menu,
  MenuTrigger,
  MenuDropdown,
  MenuDivider,
  MenuLabel,
  MenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
};
