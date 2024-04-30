import {
  ComponentProps,
  ComponentType,
  createContext,
  useContext,
} from "react";
import { SuggestionMenuEmptyItem } from "../components/SuggestionMenu/implementation/SuggestionMenuEmptyItem";
import { SuggestionMenuItem } from "../components/SuggestionMenu/implementation/SuggestionMenuItem";
import { SuggestionMenuLabel } from "../components/SuggestionMenu/implementation/SuggestionMenuLabel";
import { SuggestionMenuLoader } from "../components/SuggestionMenu/implementation/SuggestionMenuLoader";

export type MenuProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "right" | "bottom" | "left";
  sub?: boolean;
};

export type TextInputProps = {
  name: string;
  label?: string;
  icon?: React.ReactNode;
  autoFocus?: boolean;
  placeholder?: string;
  value?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
};

export type MenuItemProps = {
  icon?: React.ReactNode;
  checked?: boolean;
  expandArrow?: boolean;
  subTrigger?: boolean;
} & ComponentProps<"div">;

export type MenuDropdownProps = {
  sub?: boolean;
  position?: "top" | "right" | "bottom" | "left";
} & ComponentProps<"div">;

export type MenuTriggerProps = {
  children: React.ReactNode;
  sub?: boolean;
};

export type SuggestionMenuItemProps = {
  title: string;
  onClick: () => void;
  subtext?: string;
  icon?: JSX.Element;
  badge?: string;
  isSelected?: boolean;
  setSelected: (selected: boolean) => void;
};

export type ToolbarButtonProps = {
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  mainTooltip: string;
  secondaryTooltip?: string;
  isSelected?: boolean;
  children?: any;
  isDisabled?: boolean;
};

export type ToolbarSelectItemProps = {
  text: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
};

export type ToolbarSelectProps = {
  // TODO: maybe don't use items array, but elements instead
  items: ToolbarSelectItemProps[];
  isDisabled?: boolean;
};

export type ComponentsContextValue = {
  Form: ComponentType<{
    children: React.ReactNode;
  }>;
  Toolbar: ComponentType<{
    children: React.ReactNode;
  }>;
  ToolbarSelect: ComponentType<ToolbarSelectProps>;

  ToolbarButton: ComponentType<ToolbarButtonProps>;
  Menu: ComponentType<MenuProps>;
  MenuTrigger: ComponentType<MenuTriggerProps>;
  MenuDropdown: ComponentType<MenuDropdownProps>;
  MenuDivider: ComponentType<Record<string, never>>;
  MenuLabel: ComponentType<{
    children: React.ReactNode;
  }>;
  MenuItem: ComponentType<MenuItemProps>;
  Popover: any;
  PopoverTrigger: any;
  PopoverContent: any;
  SuggestionMenuLabel?: ComponentType<{
    children: React.ReactNode;
  }>;
  SuggestionMenuLoader?: React.ElementType;
  SuggestionMenuItem?: ComponentType<SuggestionMenuItemProps>;
  SuggestionMenuEmptyItem?: ComponentType<{
    children: React.ReactNode;
  }>;
  TextInput: ComponentType<TextInputProps>;
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
