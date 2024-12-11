import {
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteViewProps,
  BlockNoteViewRaw,
  Components,
  ComponentsContext,
} from "@blocknote/react";
import { useMemo } from "react";

import { Form } from "./form/Form.js";
import { TextInput } from "./form/TextInput.js";
import {
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu/Menu.js";
import { Panel } from "./panel/Panel.js";
import { PanelTab } from "./panel/PanelTab.js";
import { PanelTextInput } from "./panel/PanelTextInput.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/popover.js";
import {
  ShadCNComponents,
  ShadCNComponentsContext,
  ShadCNDefaultComponents,
} from "./ShadCNComponentsContext.js";
import { SideMenu } from "./sideMenu/SideMenu.js";
import { SideMenuButton } from "./sideMenu/SideMenuButton.js";
import { GridSuggestionMenu } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenu.js";
import { GridSuggestionMenuEmptyItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuEmptyItem.js";
import { SuggestionMenu } from "./suggestionMenu/SuggestionMenu.js";
import { SuggestionMenuEmptyItem } from "./suggestionMenu/SuggestionMenuEmptyItem.js";
import { SuggestionMenuItem } from "./suggestionMenu/SuggestionMenuItem.js";
import { SuggestionMenuLabel } from "./suggestionMenu/SuggestionMenuLabel.js";
import { SuggestionMenuLoader } from "./suggestionMenu/SuggestionMenuLoader.js";
import { ExtendButton } from "./tableHandle/ExtendButton.js";
import { TableHandle } from "./tableHandle/TableHandle.js";
import { Toolbar, ToolbarButton, ToolbarSelect } from "./toolbar/Toolbar.js";

import { PanelButton } from "./panel/PanelButton.js";
import { PanelFileInput } from "./panel/PanelFileInput.js";
import "./style.css";
import { GridSuggestionMenuItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuItem.js";
import { GridSuggestionMenuLoader } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuLoader.js";

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
  GridSuggestionMenu: {
    Root: GridSuggestionMenu,
    Item: GridSuggestionMenuItem,
    EmptyItem: GridSuggestionMenuEmptyItem,
    Loader: GridSuggestionMenuLoader,
  },
  TableHandle: {
    Root: TableHandle,
    ExtendButton: ExtendButton,
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
  props: BlockNoteViewProps<BSchema, ISchema, SSchema> & {
    /**
     * (optional)Provide your own shadcn component overrides
     */
    shadCNComponents?: Partial<ShadCNComponents>;
  }
) => {
  const { className, shadCNComponents, ...rest } = props;

  const componentsValue = useMemo(() => {
    return {
      ...ShadCNDefaultComponents,
      ...shadCNComponents,
    };
  }, [shadCNComponents]);

  return (
    <ShadCNComponentsContext.Provider value={componentsValue}>
      <ComponentsContext.Provider value={components}>
        <BlockNoteViewRaw
          className={mergeCSSClasses("bn-shadcn", className || "")}
          {...rest}
        />
      </ComponentsContext.Provider>
    </ShadCNComponentsContext.Provider>
  );
};
