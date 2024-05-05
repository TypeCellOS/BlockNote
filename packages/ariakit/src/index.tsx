import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import {
  BlockNoteViewRaw,
  Components,
  ComponentsContext,
} from "@blocknote/react";
import { ComponentProps } from "react";

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
import { Panel } from "./panel/Panel";
import { PanelButton } from "./panel/PanelButton";
import { PanelFileInput } from "./panel/PanelFileInput";
import { PanelTab } from "./panel/PanelTab";
import { PanelTextInput } from "./panel/PanelTextInput";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/Popover";
import { SideMenu } from "./sideMenu/SideMenu";
import { SideMenuButton } from "./sideMenu/SideMenuButton";
import { SuggestionMenu } from "./suggestionMenu/SuggestionMenu";
import { SuggestionMenuItem } from "./suggestionMenu/SuggestionMenuItem";
import { SuggestionMenuEmptyItem } from "./suggestionMenu/SuggestionMenuEmptyItem";
import { SuggestionMenuLabel } from "./suggestionMenu/SuggestionMenuLabel";
import { SuggestionMenuLoader } from "./suggestionMenu/SuggestionMenuLoader";
import { TableHandle } from "./tableHandle/TableHandle";
import { Toolbar } from "./toolbar/Toolbar";
import { ToolbarButton } from "./toolbar/ToolbarButton";
import { ToolbarSelect } from "./toolbar/ToolbarSelect";

import "./style.css";

export const components: Components = {
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
  SideMenu: {
    Root: SideMenu,
    Button: SideMenuButton,
  },
  SuggestionMenu: {
    Root: SuggestionMenu,
    Item: SuggestionMenuItem,
    EmptyItem: SuggestionMenuEmptyItem,
    Label: SuggestionMenuLabel,
    Loader: SuggestionMenuLoader,
  },
  TableHandle: {
    Root: TableHandle,
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
};

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: ComponentProps<typeof BlockNoteViewRaw<BSchema, ISchema, SSchema>>
) => {
  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw {...props} />
    </ComponentsContext.Provider>
  );
};
