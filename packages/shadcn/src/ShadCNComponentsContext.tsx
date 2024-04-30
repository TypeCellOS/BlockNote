import * as ShadCNBadge from "./components/ui/badge";
import * as ShadCNButton from "./components/ui/button";
import * as ShadCNCard from "./components/ui/card";
import * as ShadCNDropdownMenu from "./components/ui/dropdown-menu";
import * as ShadCNForm from "./components/ui/form";
import * as ShadCNInput from "./components/ui/input";
import * as ShadCNLabel from "./components/ui/label";
import * as ShadCNPopover from "./components/ui/popover";
import * as ShadCNSelect from "./components/ui/select";
import * as ShadCNTabs from "./components/ui/tabs";
import * as ShadCNToggle from "./components/ui/toggle";
import * as ShadCNTooltip from "./components/ui/tooltip";

import { createContext, useContext } from "react";

export const ShadCNDefaultComponents = {
  Badge: ShadCNBadge,
  Button: ShadCNButton,
  Card: ShadCNCard,
  DropdownMenu: ShadCNDropdownMenu,
  Form: ShadCNForm,
  Input: ShadCNInput,
  Label: ShadCNLabel,
  Popover: ShadCNPopover,
  Select: ShadCNSelect,
  Tabs: ShadCNTabs,
  Toggle: ShadCNToggle,
  Tooltip: ShadCNTooltip,
};

export type ShadCNComponents = typeof ShadCNDefaultComponents;

export const ShadCNComponentsContext = createContext<
  ShadCNComponents | undefined
>(undefined);

export function useShadCNComponentsContext() {
  return useContext(ShadCNComponentsContext);
}
