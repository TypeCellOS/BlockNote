import { Loader, PopoverDropdown, PopoverTarget } from "@mantine/core";
import { ComponentsContextValue } from "../editor/ComponentsContext";
import { TextInput } from "./input/TextInput";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu/Menu";
import { Panel } from "./panel/Panel";
import { PanelButton } from "./panel/PanelButton";
import { PanelFileInput } from "./panel/PanelFileInput";
import { PanelTab } from "./panel/PanelTab";
import { PanelTextInput } from "./panel/PanelTextInput";
import { Popover } from "./popover/Popover";
import { Toolbar } from "./toolbar/Toolbar";
import { ToolbarButton } from "./toolbar/ToolbarButton";
import { ToolbarSelect } from "./toolbar/ToolbarSelect";

export const mantineComponents: ComponentsContextValue = {
  Toolbar,
  ToolbarButton,
  ToolbarSelect,
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
  Popover: Popover,
  PopoverContent: PopoverDropdown,
  PopoverTrigger: PopoverTarget,
  TextInput,
  Form: (props) => <div {...props} />,
  SuggestionMenuLoader: () => (
    <Loader className={"bn-slash-menu-loader"} type="dots" />
  ),
};
