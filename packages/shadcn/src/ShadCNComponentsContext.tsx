import {
  Avatar as ShadCNAvatar,
  AvatarFallback as ShadCNAvatarFallback,
  AvatarImage as ShadCNAvatarImage,
} from "./components/ui/avatar.js";
import { Badge as ShadCNBadge } from "./components/ui/badge.js";
import { Button as ShadCNButton } from "./components/ui/button.js";
import {
  Card as ShadCNCard,
  CardContent as ShadCNCardContent,
} from "./components/ui/card.js";
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
} from "./components/ui/dropdown-menu.js";
import { Form as ShadCNForm } from "./components/ui/form.js";
import { Input as ShadCNInput } from "./components/ui/input.js";
import { Label as ShadCNLabel } from "./components/ui/label.js";
import {
  Popover as ShadCNPopover,
  PopoverContent as ShadCNPopoverContent,
  PopoverTrigger as ShadCNPopoverTrigger,
} from "./components/ui/popover.js";
import {
  Select as ShadCNSelect,
  SelectContent as ShadCNSelectContent,
  SelectItem as ShadCNSelectItem,
  SelectTrigger as ShadCNSelectTrigger,
  SelectValue as ShadCNSelectValue,
} from "./components/ui/select.js";
import { Skeleton as ShadCNSkeleton } from "./components/ui/skeleton.js";
import {
  Tabs as ShadCNTabs,
  TabsContent as ShadCNTabsContent,
  TabsList as ShadCNTabsList,
  TabsTrigger as ShadCNTabsTrigger,
} from "./components/ui/tabs.js";
import { Toggle as ShadCNToggle } from "./components/ui/toggle.js";
import {
  Tooltip as ShadCNTooltip,
  TooltipContent as ShadCNTooltipContent,
  TooltipProvider as ShadCNTooltipProvider,
  TooltipTrigger as ShadCNTooltipTrigger,
} from "./components/ui/tooltip.js";

import { createContext, useContext } from "react";

export const ShadCNDefaultComponents = {
  Avatar: {
    Avatar: ShadCNAvatar,
    AvatarFallback: ShadCNAvatarFallback,
    AvatarImage: ShadCNAvatarImage,
  },
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
  Skeleton: {
    Skeleton: ShadCNSkeleton,
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
