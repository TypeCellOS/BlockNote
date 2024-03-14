import { createContext, useContext } from "react";

export type ComponentsContextValue = {
  Toolbar: React.ElementType;
  ToolbarSelect: React.ElementType;
  ToolbarButton: any;
};

export const ComponentsContext = createContext<
  ComponentsContextValue | undefined
>(undefined);

export function useComponentsContext(): ComponentsContextValue | undefined {
  const context = useContext(ComponentsContext) as any;

  return context;
}
