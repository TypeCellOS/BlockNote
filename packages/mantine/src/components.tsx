import { Components } from "@blocknote/react";
import { Badge, BadgeGroup } from "./badge/Badge.js";
import { Card, CardSection, ExpandSectionsPrompt } from "./comments/Card.js";
import { Comment } from "./comments/Comment.js";
import { Editor } from "./comments/Editor.js";
import { TextInput } from "./form/TextInput.js";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu/Menu.js";
import { Button } from "./menu/Button.js";
import { Panel } from "./panel/Panel.js";
import { PanelButton } from "./panel/PanelButton.js";
import { PanelFileInput } from "./panel/PanelFileInput.js";
import { PanelTab } from "./panel/PanelTab.js";
import { PanelTextInput } from "./panel/PanelTextInput.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/Popover.js";
import { SideMenu } from "./sideMenu/SideMenu.js";
import { SideMenuButton } from "./sideMenu/SideMenuButton.js";
import { SuggestionMenu } from "./suggestionMenu/SuggestionMenu.js";
import { SuggestionMenuEmptyItem } from "./suggestionMenu/SuggestionMenuEmptyItem.js";
import { SuggestionMenuItem } from "./suggestionMenu/SuggestionMenuItem.js";
import { SuggestionMenuLabel } from "./suggestionMenu/SuggestionMenuLabel.js";
import { SuggestionMenuLoader } from "./suggestionMenu/SuggestionMenuLoader.js";
import { GridSuggestionMenu } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenu.js";
import { GridSuggestionMenuEmptyItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuEmptyItem.js";
import { GridSuggestionMenuItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuItem.js";
import { GridSuggestionMenuLoader } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuLoader.js";
import { ExtendButton } from "./tableHandle/ExtendButton.js";
import { TableHandle } from "./tableHandle/TableHandle.js";
import { Toolbar } from "./toolbar/Toolbar.js";
import { ToolbarButton } from "./toolbar/ToolbarButton.js";
import { ToolbarSelect } from "./toolbar/ToolbarSelect.js";

export const components: Components = {
  FormattingToolbar: {
    Root: Toolbar,
    Button: ToolbarButton,
    Select: ToolbarSelect,
  },
  FilePanel: {
    Root: Panel,
    Button: PanelButton,
    FileInput: PanelFileInput,
    TabPanel: PanelTab,
    TextInput: PanelTextInput,
  },
  GridSuggestionMenu: {
    Root: GridSuggestionMenu,
    Item: GridSuggestionMenuItem,
    EmptyItem: GridSuggestionMenuEmptyItem,
    Loader: GridSuggestionMenuLoader,
  },
  LinkToolbar: {
    Root: Toolbar,
    Button: ToolbarButton,
    Select: ToolbarSelect,
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
    ExtendButton: ExtendButton,
  },
  Generic: {
    Badge: {
      Root: Badge,
      Group: BadgeGroup,
    },
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
      Button: Button,
    },
    Popover: {
      Root: Popover,
      Trigger: PopoverTrigger,
      Content: PopoverContent,
    },
    Toolbar: {
      Root: Toolbar,
      Button: ToolbarButton,
      Select: ToolbarSelect,
    },
  },
  Comments: {
    Comment,
    Editor,
    Card,
    CardSection,
    ExpandSectionsPrompt,
  },
};
