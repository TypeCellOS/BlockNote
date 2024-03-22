import { ComponentsContextValue } from "../editor/ComponentsContext";
import "./ariakit.css";
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
import { Toolbar } from "./toolbar/Toolbar";
import { ToolbarButton } from "./toolbar/ToolbarButton";
import { ToolbarSelect } from "./toolbar/ToolbarSelect";

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
