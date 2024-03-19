import { ComponentType, createContext, useContext } from "react";

export type MenuProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "right" | "bottom" | "left";
};

export type ComponentsContextValue = {
  Toolbar: React.ElementType;
  ToolbarSelect: React.ElementType;
  ToolbarButton: any;
  Menu: ComponentType<MenuProps>;
  MenuTrigger: ComponentType<{
    children: React.ReactNode;
  }>;
  MenuDropdown: ComponentType<{
    children: React.ReactNode;
  }>;
  MenuDivider: ComponentType<Record<string, never>>;
  MenuLabel: any;
  MenuItem: any;
  Popover: any;
  PopoverTrigger: any;
  PopoverContent: any;
};

export const ComponentsContext = createContext<
  ComponentsContextValue | undefined
>(undefined);

export function useComponentsContext(): ComponentsContextValue | undefined {
  const context = useContext(ComponentsContext) as any;

  return context;
}
