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

import { Panel } from "./panel/Panel";
import { PanelButton } from "./panel/PanelButton";
import { PanelFileInput } from "./panel/PanelFileInput";
import { PanelTab } from "./panel/PanelTab";
import { PanelTextInput } from "./panel/PanelTextInput";

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
  Panel,
  PanelButton,
  PanelFileInput,
  PanelTab,
  PanelTextInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
};
