import * as ShadCNButton from "@/components/ui/button";
import * as ShadCNCard from "@/components/ui/card";
import * as ShadCNDropdownMenu from "@/components/ui/dropdown-menu";
import * as ShadCNInput from "@/components/ui/input";
import * as ShadCNLabel from "@/components/ui/label";
import * as ShadCNPopover from "@/components/ui/popover";
import * as ShadCNSelect from "@/components/ui/select";
import * as ShadCNTabs from "@/components/ui/tabs";
import * as ShadCNToggle from "@/components/ui/toggle";
import * as ShadCNTooltip from "@/components/ui/tooltip";

import { ComponentType, createContext, useContext } from "react";
import { ComponentProps } from "@blocknote/react";

export type ShadCNComponents = {
  Button: typeof ShadCNButton.Button;
  Card: typeof ShadCNCard.Card;
  CardContent: typeof ShadCNCard.CardContent;
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
  SelectItemContent: ComponentType<
    ComponentProps["FormattingToolbar"]["Select"]["items"][number]
  >;
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

export const ShadCNComponentsContext = createContext<
  Partial<ShadCNComponents> | undefined
>(undefined);

export function useShadCNComponentsContext() {
  return useContext(ShadCNComponentsContext);
}
