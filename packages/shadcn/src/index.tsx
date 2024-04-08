import {
  BlockNoteViewRaw,
  ComponentsContext,
  ComponentsContextValue,
} from "@blocknote/react";
import { ComponentProps } from "react";
import { Form } from "./form/Form";
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

export const components: ComponentsContextValue = {
  Toolbar,
  ToolbarButton,
  ToolbarSelect,
  Menu,
  MenuTrigger,
  MenuDropdown,
  MenuLabel,
  MenuDivider,
  MenuItem,
  Panel,
  PanelButton,
  PanelFileInput,
  PanelTab,
  PanelTextInput,
  Popover: Popover,
  PopoverContent: PopoverContent,
  PopoverTrigger: PopoverTrigger,
  TextInput: TextInput,
  Form: Form,
  //   SuggestionMenuLoader: () => (
  //     <Loader className={"bn-slash-menu-loader"} type="dots" />
  //   ),
};

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
