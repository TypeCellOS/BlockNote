import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "../components/mantine-shared/Menu/Menu";
import { Toolbar } from "../components/mantine-shared/Toolbar/Toolbar";
import { ToolbarButton } from "../components/mantine-shared/Toolbar/ToolbarButton";
import { ToolbarSelect } from "../components/mantine-shared/Toolbar/ToolbarSelect";
import { ComponentsContextValue } from "../editor/ComponentsContext";

export const mantineComponents: ComponentsContextValue = {
  Toolbar,
  ToolbarButton,
  ToolbarSelect,
  Menu,
  MenuTarget,
  MenuDropdown,
  MenuDivider,
  MenuLabel,
  MenuItem,
};
