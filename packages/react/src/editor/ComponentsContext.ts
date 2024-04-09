import {
  ComponentType,
  createContext,
  ReactNode,
  useContext,
  KeyboardEvent,
  MouseEvent,
  ChangeEvent,
  ElementType,
} from "react";
import { SuggestionMenuEmptyItem } from "../components/SuggestionMenu/implementation/SuggestionMenuEmptyItem";
import { SuggestionMenuItem } from "../components/SuggestionMenu/implementation/SuggestionMenuItem";
import { SuggestionMenuLabel } from "../components/SuggestionMenu/implementation/SuggestionMenuLabel";
import { SuggestionMenuLoader } from "../components/SuggestionMenu/implementation/SuggestionMenuLoader";

export type FormProps = {
  children: ReactNode;
};

export type MenuProps = {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "right" | "bottom" | "left";
  sub?: boolean;
};

export type MenuDividerProps = Record<string, never>;

export type MenuDropdownProps = {
  className?: string;
  sub?: boolean;
  children: ReactNode;
};

export type MenuItemProps = {
  icon?: ReactNode;
  checked?: boolean;
  subTrigger?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export type MenuLabelProps = {
  children: ReactNode;
};

export type MenuTriggerProps = {
  sub?: boolean;
  children: ReactNode;
};

export type PanelProps = {
  defaultOpenTab: string;
  openTab: string;
  setOpenTab: (name: string) => void;
  tabs: {
    name: string;
    tabPanel: ReactNode;
  }[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

export type PanelButtonProps = {
  className: string;
  onClick: () => void;
  children: ReactNode;
};

export type PanelFileInputProps = {
  placeholder?: string;
  value?: File | null;
  onChange?: (payload: File | null) => void;
};

export type PanelTabProps = {
  children: ReactNode;
};

export type PanelTextInputProps = {
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

export type PopoverProps = {
  opened?: boolean;
  position?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
};

export type PopoverTriggerProps = {
  children: ReactNode;
};

export type PopoverContentProps = {
  children: ReactNode;
};

export type SuggestionMenuEmptyItemProps = {
  children: ReactNode;
};

export type SuggestionMenuItemProps = {
  title: string;
  subtext?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  setSelected?: (selected: boolean) => void;
};

export type SuggestionMenuLabelProps = {
  children: ReactNode;
};

export type TextInputProps = {
  name: string;
  label?: string;
  icon?: ReactNode;
  autoFocus?: boolean;
  placeholder?: string;
  value?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
};

export type ToolbarProps = {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
};

export type ToolbarButtonProps = {
  onClick?: (e: MouseEvent) => void;
  icon?: ReactNode;
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

export type ToolbarSelectItem = {
  text: string;
  icon?: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
};

export type ToolbarSelectProps = {
  items: ToolbarSelectItem[];
  isDisabled?: boolean;
};

export type ComponentsContextValue = {
  Form: ComponentType<FormProps>;

  Menu: ComponentType<MenuProps>;
  MenuTrigger: ComponentType<MenuTriggerProps>;
  MenuDropdown: ComponentType<MenuDropdownProps>;
  MenuDivider: ComponentType<MenuDividerProps>;
  MenuLabel: ComponentType<MenuLabelProps>;
  MenuItem: ComponentType<MenuItemProps>;

  Panel: ComponentType<PanelProps>;
  PanelButton: ComponentType<PanelButtonProps>;
  PanelFileInput: ComponentType<PanelFileInputProps>;
  PanelTab: ComponentType<PanelTabProps>;
  PanelTextInput: ComponentType<PanelTextInputProps>;

  Popover: ComponentType<PopoverProps>;
  PopoverTrigger: ComponentType<PopoverTriggerProps>;
  PopoverContent: ComponentType<PopoverContentProps>;

  SuggestionMenuLabel?: ComponentType<SuggestionMenuLabelProps>;
  SuggestionMenuLoader?: ElementType;
  SuggestionMenuItem?: ComponentType<SuggestionMenuItemProps>;
  SuggestionMenuEmptyItem?: ComponentType<SuggestionMenuEmptyItemProps>;

  TextInput: ComponentType<TextInputProps>;

  Toolbar: ComponentType<ToolbarProps>;
  ToolbarSelect: ComponentType<ToolbarSelectProps>;
  ToolbarButton: ComponentType<ToolbarButtonProps>;
};

export const ComponentsContext = createContext<
  ComponentsContextValue | undefined
>(undefined);

export function useComponentsContext():
  | Required<ComponentsContextValue>
  | undefined {
  const context = useContext(ComponentsContext)!;

  return {
    // defaults
    SuggestionMenuEmptyItem,
    SuggestionMenuLabel,
    SuggestionMenuItem,
    SuggestionMenuLoader,

    // provided
    ...context,
  };
}
