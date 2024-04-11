import {
  BlockNoteViewRaw,
  Components,
  ComponentsContext,
} from "@blocknote/react";
import { ComponentProps } from "react";
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
import { Toolbar, ToolbarButton, ToolbarSelect } from "./toolbar/Toolbar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { TextInput } from "./input/TextInput";
import "./style.css";
import { createComponentsContext } from "../../react/src";

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
      Root: (props) => <div>{props.children}</div>,
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
  console.log("render shad");
  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw {...props} />
    </ComponentsContext.Provider>
  );
};
