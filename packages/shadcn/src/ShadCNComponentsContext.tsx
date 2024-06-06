import { Badge as ShadCNBadge } from "./components/ui/badge";
import { Button as ShadCNButton } from "./components/ui/button";
import {
  Card as ShadCNCard,
  CardContent as ShadCNCardContent,
} from "./components/ui/card";
import {
  DropdownMenu as ShadCNDropdownMenu,
  DropdownMenuCheckboxItem as ShadCNDropdownMenuCheckboxItem,
  DropdownMenuContent as ShadCNDropdownMenuContent,
  DropdownMenuItem as ShadCNDropdownMenuItem,
  DropdownMenuLabel as ShadCNDropdownMenuLabel,
  DropdownMenuSeparator as ShadCNDropdownMenuSeparator,
  DropdownMenuSub as ShadCNDropdownMenuSub,
  DropdownMenuSubContent as ShadCNDropdownMenuSubContent,
  DropdownMenuSubTrigger as ShadCNDropdownMenuSubTrigger,
  DropdownMenuTrigger as ShadCNDropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Form as ShadCNForm } from "./components/ui/form";
import { Input as ShadCNInput } from "./components/ui/input";
import { Label as ShadCNLabel } from "./components/ui/label";
import {
  Popover as ShadCNPopover,
  PopoverContent as ShadCNPopoverContent,
  PopoverTrigger as ShadCNPopoverTrigger,
} from "./components/ui/popover";
import {
  Select as ShadCNSelect,
  SelectContent as ShadCNSelectContent,
  SelectItem as ShadCNSelectItem,
  SelectTrigger as ShadCNSelectTrigger,
  SelectValue as ShadCNSelectValue,
} from "./components/ui/select";
import {
  Tabs as ShadCNTabs,
  TabsContent as ShadCNTabsContent,
  TabsList as ShadCNTabsList,
  TabsTrigger as ShadCNTabsTrigger,
} from "./components/ui/tabs";
import { Toggle as ShadCNToggle } from "./components/ui/toggle";
import {
  Tooltip as ShadCNTooltip,
  TooltipContent as ShadCNTooltipContent,
  TooltipProvider as ShadCNTooltipProvider,
  TooltipTrigger as ShadCNTooltipTrigger,
} from "./components/ui/tooltip";

import { createContext, useContext } from "react";

export const ShadCNDefaultComponents = {
  Badge: {
    Badge: ShadCNBadge,
  },
  Button: {
    Button: ShadCNButton,
  },
  Card: {
    Card: ShadCNCard,
    CardContent: ShadCNCardContent,
  },
  DropdownMenu: {
    DropdownMenu: ShadCNDropdownMenu,
    DropdownMenuCheckboxItem: ShadCNDropdownMenuCheckboxItem,
    DropdownMenuContent: ShadCNDropdownMenuContent,
    DropdownMenuItem: ShadCNDropdownMenuItem,
    DropdownMenuLabel: ShadCNDropdownMenuLabel,
    DropdownMenuSeparator: ShadCNDropdownMenuSeparator,
    DropdownMenuSub: ShadCNDropdownMenuSub,
    DropdownMenuSubContent: ShadCNDropdownMenuSubContent,
    DropdownMenuSubTrigger: ShadCNDropdownMenuSubTrigger,
    DropdownMenuTrigger: ShadCNDropdownMenuTrigger,
  },
  Form: {
    Form: ShadCNForm,
  },
  Input: {
    Input: ShadCNInput,
  },
  Label: {
    Label: ShadCNLabel,
  },
  Popover: {
    Popover: ShadCNPopover,
    PopoverContent: ShadCNPopoverContent,
    PopoverTrigger: ShadCNPopoverTrigger,
  },
  Select: {
    Select: ShadCNSelect,
    SelectContent: ShadCNSelectContent,
    SelectItem: ShadCNSelectItem,
    SelectTrigger: ShadCNSelectTrigger,
    SelectValue: ShadCNSelectValue,
  },
  Tabs: {
    Tabs: ShadCNTabs,
    TabsContent: ShadCNTabsContent,
    TabsList: ShadCNTabsList,
    TabsTrigger: ShadCNTabsTrigger,
  },
  Toggle: {
    Toggle: ShadCNToggle,
  },
  Tooltip: {
    Tooltip: ShadCNTooltip,
    TooltipContent: ShadCNTooltipContent,
    TooltipProvider: ShadCNTooltipProvider,
    TooltipTrigger: ShadCNTooltipTrigger,
  },
};

export type ShadCNComponents = typeof ShadCNDefaultComponents;

export const ShadCNComponentsContext = createContext<
  ShadCNComponents | undefined
>(undefined);

export function useShadCNComponentsContext() {
  return useContext(ShadCNComponentsContext);
}
