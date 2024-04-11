import {
  BlockNoteViewRaw,
  Components,
  ComponentsContext,
  createComponentsContext,
} from "@blocknote/react";
import "./style.css";
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
import { ComponentProps } from "react";

export const components: Components = createComponentsContext({
  FormattingToolbar: {
    Root: Toolbar,
    Button: ToolbarButton,
    Select: ToolbarSelect,
  },
  ImagePanel: {
    Root: Panel,
    Button: PanelButton,
    FileInput: PanelFileInput,
    TabPanel: PanelTab,
    TextInput: PanelTextInput,
  },
  LinkToolbar: {
    Root: Toolbar,
    Button: ToolbarButton,
  },
  Generic: {
    Form: {
      Root: Form,
      TextInput: TextInput,
    },
    Menu: {
      Root: Menu,
      Trigger: MenuTrigger,
      Dropdown: MenuDropdown,
      Divider: MenuDivider,
      Label: MenuLabel,
      Item: MenuItem,
    },
    Popover: {
      Root: Popover,
      Trigger: PopoverTrigger,
      Content: PopoverContent,
    },
  },
});

export const BlockNoteView = (
  props: ComponentProps<typeof BlockNoteViewRaw>
) => {
  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw {...props} />
    </ComponentsContext.Provider>
  );
};
