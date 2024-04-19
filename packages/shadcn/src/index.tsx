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

import * as ShadCNButton from "./components/ui/button";
import * as ShadCNDropdownMenu from "./components/ui/dropdown-menu";
import * as ShadCNInput from "./components/ui/input";
import * as ShadCNLabel from "./components/ui/label";
import * as ShadCNPopover from "./components/ui/popover";
import * as ShadCNSelect from "./components/ui/select";
import * as ShadCNTabs from "./components/ui/tabs";
import * as ShadCNToggle from "./components/ui/toggle";
import * as ShadCNTooltip from "./components/ui/tooltip";

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

export type ShadCNComponents = {
  Button: typeof ShadCNButton.Button;
  DropdownMenu: typeof ShadCNDropdownMenu.DropdownMenu;
  DropdownMenuCheckboxItem: typeof ShadCNDropdownMenu.DropdownMenuCheckboxItem;
  DropdownMenuContent: typeof ShadCNDropdownMenu.DropdownMenuContent;
  DropdownMenuItem: typeof ShadCNDropdownMenu.DropdownMenuItem;
  DropdownMenuLabel: typeof ShadCNDropdownMenu.DropdownMenuLabel;
  DropdownMenuSeparator: typeof ShadCNDropdownMenu.DropdownMenuSeparator;
  DropdownMenuSub: typeof ShadCNDropdownMenu.DropdownMenuSub;
  DropdownMenuSubContent: typeof ShadCNDropdownMenu.DropdownMenuSubContent;
  DropdownMenuSubTrigger: typeof ShadCNDropdownMenu.DropdownMenuSubTrigger;
  DropdownMenuTrigger: typeof ShadCNDropdownMenu.DropdownMenuTrigger;
  Input: typeof ShadCNInput.Input;
  Label: typeof ShadCNLabel.Label;
  Popover: typeof ShadCNPopover.Popover;
  PopoverContent: typeof ShadCNPopover.PopoverContent;
  PopoverTrigger: typeof ShadCNPopover.PopoverTrigger;
  Select: typeof ShadCNSelect.Select;
  SelectContent: typeof ShadCNSelect.SelectContent;
  SelectItem: typeof ShadCNSelect.SelectItem;
  SelectTrigger: typeof ShadCNSelect.SelectTrigger;
  SelectValue: typeof ShadCNSelect.SelectValue;
  Tabs: typeof ShadCNTabs.Tabs;
  TabsContent: typeof ShadCNTabs.TabsContent;
  TabsList: typeof ShadCNTabs.TabsList;
  TabsTrigger: typeof ShadCNTabs.TabsTrigger;
  Toggle: typeof ShadCNToggle.Toggle;
  Tooltip: typeof ShadCNTooltip.Tooltip;
  TooltipContent: typeof ShadCNTooltip.TooltipContent;
  TooltipProvider: typeof ShadCNTooltip.TooltipProvider;
  TooltipTrigger: typeof ShadCNTooltip.TooltipTrigger;
};

export const createShadCNComponentContext = (
  Components?: Partial<ShadCNComponents>
) =>
  createComponentsContext({
    FormattingToolbar: {
      Root: (props) => {
        const { children, ...rest } = props;

        return (
          <Toolbar TooltipProvider={Components?.TooltipProvider} {...rest}>
            {children}
          </Toolbar>
        );
      },
      Button: (props) => {
        const { children, ...rest } = props;

        return (
          <ToolbarButton
            Button={Components?.Button}
            Toggle={Components?.Toggle}
            Tooltip={Components?.Tooltip}
            TooltipContent={Components?.TooltipContent}
            TooltipTrigger={Components?.TooltipTrigger}
            {...rest}>
            {children}
          </ToolbarButton>
        );
      },
      Select: (props) => (
        <ToolbarSelect
          Select={Components?.Select}
          SelectContent={Components?.SelectContent}
          SelectItem={Components?.SelectItem}
          SelectTrigger={Components?.SelectTrigger}
          SelectValue={Components?.SelectValue}
          {...props}
        />
      ),
    },
    ImagePanel: {
      Root: Panel,
      Button: (props) => {
        const { children, ...rest } = props;

        return (
          <PanelButton Button={Components?.Button} {...rest}>
            {children}
          </PanelButton>
        );
      },
      FileInput: (props) => (
        <PanelFileInput Input={Components?.Input} {...props} />
      ),
      TabPanel: PanelTab,
      TextInput: (props) => (
        <PanelTextInput Input={Components?.Input} {...props} />
      ),
    },
    LinkToolbar: {
      Root: (props) => {
        const { children, ...rest } = props;

        return (
          <Toolbar TooltipProvider={Components?.TooltipProvider} {...rest}>
            {children}
          </Toolbar>
        );
      },
      Button: (props) => {
        const { children, ...rest } = props;

        return (
          <ToolbarButton
            Button={Components?.Button}
            Toggle={Components?.Toggle}
            Tooltip={Components?.Tooltip}
            TooltipContent={Components?.TooltipContent}
            TooltipTrigger={Components?.TooltipTrigger}
            {...rest}>
            {children}
          </ToolbarButton>
        );
      },
    },
    Generic: {
      Form: {
        Root: (props) => <div>{props.children}</div>,
        TextInput: (props) => (
          <TextInput
            Input={Components?.Input}
            Label={Components?.Label}
            {...props}
          />
        ),
      },
      Menu: {
        Root: (props) => {
          const { children, ...rest } = props;

          return (
            <Menu
              DropdownMenu={Components?.DropdownMenu}
              DropdownMenuSub={Components?.DropdownMenuSub}
              {...rest}>
              {children}
            </Menu>
          );
        },
        Trigger: (props) => {
          const { children, ...rest } = props;

          return (
            <MenuTrigger
              DropdownMenuSubTrigger={Components?.DropdownMenuSubTrigger}
              DropdownMenuTrigger={Components?.DropdownMenuTrigger}
              {...rest}>
              {children}
            </MenuTrigger>
          );
        },
        Dropdown: (props) => {
          const { children, ...rest } = props;

          return (
            <MenuDropdown
              DropdownMenuContent={Components?.DropdownMenuContent}
              DropdownMenuSubContent={Components?.DropdownMenuSubContent}
              {...rest}>
              {children}
            </MenuDropdown>
          );
        },
        Divider: (props) => (
          <MenuDivider
            DropdownMenuSeparator={Components?.DropdownMenuSeparator}
            {...props}
          />
        ),
        Label: (props) => {
          const { children, ...rest } = props;

          return (
            <MenuLabel
              DropdownMenuLabel={Components?.DropdownMenuLabel}
              {...rest}>
              {children}
            </MenuLabel>
          );
        },
        Item: (props) => {
          const { children, ...rest } = props;

          return (
            <MenuItem
              DropdownMenuCheckboxItem={Components?.DropdownMenuCheckboxItem}
              DropdownMenuItem={Components?.DropdownMenuItem}
              {...rest}>
              {children}
            </MenuItem>
          );
        },
      },
      Popover: {
        Root: Components?.Popover || Popover,
        Trigger: Components?.PopoverTrigger || PopoverTrigger,
        Content: Components?.PopoverContent || PopoverContent,
      },
    },
  });

export const BlockNoteView = (
  props: ComponentProps<typeof BlockNoteViewRaw> & {
    Components?: Partial<ShadCNComponents>;
  }
) => {
  const { Components, ...rest } = props;

  console.log("render shad");
  return (
    <ComponentsContext.Provider
      value={createShadCNComponentContext(Components)}>
      <BlockNoteViewRaw {...rest} />
    </ComponentsContext.Provider>
  );
};
