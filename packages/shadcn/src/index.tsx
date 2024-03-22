import {
  BlockNoteViewRaw,
  ComponentsContext,
  ComponentsContextValue,
} from "@blocknote/react";
import { ComponentProps } from "react";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import "./style.css";

export const components: ComponentsContextValue = {
  Toolbar: (props) => (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2" {...props} />
    </TooltipProvider>
  ),
  ToolbarButton: (props) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={props.onClick}
          variant="ghost"
          size="icon"
          disabled={props.isDisabled}>
          {props.icon}
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.mainTooltip}</TooltipContent>
      {/* TODO: secondary tooltip */}
    </Tooltip>
  ),
  ToolbarSelect: (props) => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  ),
  Menu: () => null,
  MenuTrigger: () => null,
  MenuDropdown: () => null,
  MenuDivider: () => null,
  MenuLabel: () => null,
  MenuItem: () => null,
  Popover: () => null,
  PopoverContent: () => null,
  PopoverTrigger: () => null,
  TextInput: () => null,
  Form: (props) => <div {...props} />,
  //   SuggestionMenuLoader: () => (
  //     <Loader className={"bn-slash-menu-loader"} type="dots" />
  //   ),
};

export const BlockNoteView = (
  props: ComponentProps<typeof BlockNoteViewRaw>
) => {
  console.log("render shad");
  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw {...props} />
    </ComponentsContext.Provider>
  );
};
