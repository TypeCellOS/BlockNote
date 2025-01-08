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
  useBlockNoteContext,
  usePrefersColorScheme,
} from "@blocknote/react";
import { MantineProvider } from "@mantine/core";
import { useCallback } from "react";

import {
  applyBlockNoteCSSVariablesFromTheme,
  removeBlockNoteCSSVariables,
  Theme,
} from "./BlockNoteTheme.js";
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
import { PanelButton } from "./panel/PanelButton.js";
import { PanelFileInput } from "./panel/PanelFileInput.js";
import { PanelTab } from "./panel/PanelTab.js";
import { PanelTextInput } from "./panel/PanelTextInput.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover/Popover.js";
import { SideMenu } from "./sideMenu/SideMenu.js";
import { SideMenuButton } from "./sideMenu/SideMenuButton.js";
import "./style.css";
import { GridSuggestionMenu } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenu.js";
import { GridSuggestionMenuEmptyItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuEmptyItem.js";
import { GridSuggestionMenuItem } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuItem.js";
import { GridSuggestionMenuLoader } from "./suggestionMenu/gridSuggestionMenu/GridSuggestionMenuLoader.js";
import { SuggestionMenu } from "./suggestionMenu/SuggestionMenu.js";
import { SuggestionMenuEmptyItem } from "./suggestionMenu/SuggestionMenuEmptyItem.js";
import { SuggestionMenuItem } from "./suggestionMenu/SuggestionMenuItem.js";
import { SuggestionMenuLabel } from "./suggestionMenu/SuggestionMenuLabel.js";
import { SuggestionMenuLoader } from "./suggestionMenu/SuggestionMenuLoader.js";
import { ExtendButton } from "./tableHandle/ExtendButton.js";
import { TableHandle } from "./tableHandle/TableHandle.js";
import { Toolbar } from "./toolbar/Toolbar.js";
import { ToolbarButton } from "./toolbar/ToolbarButton.js";
import { ToolbarSelect } from "./toolbar/ToolbarSelect.js";

export * from "./BlockNoteTheme.js";
export * from "./defaultThemes.js";

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
};

const mantineTheme = {
  // Removes button press effect
  activeClassName: "",
};

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: Omit<BlockNoteViewProps<BSchema, ISchema, SSchema>, "theme"> & {
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
  }
) => {
  const { className, theme, ...rest } = props;

  const existingContext = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();
  const defaultColorScheme =
    existingContext?.colorSchemePreference || systemColorScheme;

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        // todo: clean variables?
        return;
      }

      removeBlockNoteCSSVariables(node);

      if (typeof theme === "object") {
        if ("light" in theme && "dark" in theme) {
          applyBlockNoteCSSVariablesFromTheme(
            theme[defaultColorScheme === "dark" ? "dark" : "light"],
            node
          );
          return;
        }

        applyBlockNoteCSSVariablesFromTheme(theme, node);
        return;
      }
    },
    [defaultColorScheme, theme]
  );

  return (
    <ComponentsContext.Provider value={components}>
      {/* `cssVariablesSelector` scopes Mantine CSS variables to only the editor, */}
      {/* as proposed here:  https://github.com/orgs/mantinedev/discussions/5685 */}
      <MantineProvider
        theme={mantineTheme}
        cssVariablesSelector=".bn-mantine"
        // This gets the element to set `data-mantine-color-scheme` on. Since we
        // don't need this attribute (we use our own theming API), we return
        // undefined here.
        getRootElement={() => undefined}>
        <BlockNoteViewRaw
          className={mergeCSSClasses("bn-mantine", className || "")}
          theme={typeof theme === "object" ? undefined : theme}
          {...rest}
          ref={ref}
        />
      </MantineProvider>
    </ComponentsContext.Provider>
  );
};
