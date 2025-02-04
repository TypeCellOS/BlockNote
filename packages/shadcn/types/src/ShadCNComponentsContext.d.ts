/// <reference types="react" />
import { Badge as ShadCNBadge } from "./components/ui/badge.js";
export declare const ShadCNDefaultComponents: {
    Badge: {
        Badge: typeof ShadCNBadge;
    };
    Button: {
        Button: import("react").ForwardRefExoticComponent<import("./components/ui/button.js").ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Card: {
        Card: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
        CardContent: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
    };
    DropdownMenu: {
        DropdownMenu: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuProps>;
        DropdownMenuCheckboxItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuCheckboxItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuLabel: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuLabelProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSeparator: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSub: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuSubProps>;
        DropdownMenuSubContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSubTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubTriggerProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-dropdown-menu").DropdownMenuTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Form: {
        Form: <TFieldValues extends import("react-hook-form").FieldValues, TContext = any, TTransformedValues extends import("react-hook-form").FieldValues | undefined = undefined>(props: import("react-hook-form").FormProviderProps<TFieldValues, TContext, TTransformedValues>) => import("react").JSX.Element;
    };
    Input: {
        Input: import("react").ForwardRefExoticComponent<import("./components/ui/input.js").InputProps & import("react").RefAttributes<HTMLInputElement>>;
    };
    Label: {
        Label: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-label").LabelProps & import("react").RefAttributes<HTMLLabelElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: import("class-variance-authority/dist/types.js").ClassProp | undefined) => string> & import("react").RefAttributes<HTMLLabelElement>>;
    };
    Popover: {
        Popover: import("react").FC<import("@radix-ui/react-popover").PopoverProps>;
        PopoverContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-popover").PopoverContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        PopoverTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-popover").PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Select: {
        Select: import("react").FC<import("@radix-ui/react-select").SelectProps>;
        SelectContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
        SelectValue: import("react").ForwardRefExoticComponent<import("@radix-ui/react-select").SelectValueProps & import("react").RefAttributes<HTMLSpanElement>>;
    };
    Tabs: {
        Tabs: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tabs").TabsProps & import("react").RefAttributes<HTMLDivElement>>;
        TabsContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsList: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsListProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Toggle: {
        Toggle: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-toggle").ToggleProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: ({
            variant?: "default" | "outline" | null | undefined;
            size?: "default" | "sm" | "lg" | null | undefined;
        } & import("class-variance-authority/dist/types.js").ClassProp) | undefined) => string> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Tooltip: {
        Tooltip: import("react").FC<import("@radix-ui/react-tooltip").TooltipProps>;
        TooltipContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tooltip").TooltipContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TooltipProvider: import("react").FC<import("@radix-ui/react-tooltip").TooltipProviderProps>;
        TooltipTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tooltip").TooltipTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
};
export type ShadCNComponents = typeof ShadCNDefaultComponents;
export declare const ShadCNComponentsContext: import("react").Context<{
    Badge: {
        Badge: typeof ShadCNBadge;
    };
    Button: {
        Button: import("react").ForwardRefExoticComponent<import("./components/ui/button.js").ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Card: {
        Card: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
        CardContent: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
    };
    DropdownMenu: {
        DropdownMenu: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuProps>;
        DropdownMenuCheckboxItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuCheckboxItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuLabel: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuLabelProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSeparator: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSub: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuSubProps>;
        DropdownMenuSubContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSubTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubTriggerProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-dropdown-menu").DropdownMenuTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Form: {
        Form: <TFieldValues extends import("react-hook-form").FieldValues, TContext = any, TTransformedValues extends import("react-hook-form").FieldValues | undefined = undefined>(props: import("react-hook-form").FormProviderProps<TFieldValues, TContext, TTransformedValues>) => import("react").JSX.Element;
    };
    Input: {
        Input: import("react").ForwardRefExoticComponent<import("./components/ui/input.js").InputProps & import("react").RefAttributes<HTMLInputElement>>;
    };
    Label: {
        Label: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-label").LabelProps & import("react").RefAttributes<HTMLLabelElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: import("class-variance-authority/dist/types.js").ClassProp | undefined) => string> & import("react").RefAttributes<HTMLLabelElement>>;
    };
    Popover: {
        Popover: import("react").FC<import("@radix-ui/react-popover").PopoverProps>;
        PopoverContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-popover").PopoverContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        PopoverTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-popover").PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Select: {
        Select: import("react").FC<import("@radix-ui/react-select").SelectProps>;
        SelectContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
        SelectValue: import("react").ForwardRefExoticComponent<import("@radix-ui/react-select").SelectValueProps & import("react").RefAttributes<HTMLSpanElement>>;
    };
    Tabs: {
        Tabs: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tabs").TabsProps & import("react").RefAttributes<HTMLDivElement>>;
        TabsContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsList: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsListProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Toggle: {
        Toggle: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-toggle").ToggleProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: ({
            variant?: "default" | "outline" | null | undefined;
            size?: "default" | "sm" | "lg" | null | undefined;
        } & import("class-variance-authority/dist/types.js").ClassProp) | undefined) => string> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Tooltip: {
        Tooltip: import("react").FC<import("@radix-ui/react-tooltip").TooltipProps>;
        TooltipContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tooltip").TooltipContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TooltipProvider: import("react").FC<import("@radix-ui/react-tooltip").TooltipProviderProps>;
        TooltipTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tooltip").TooltipTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
} | undefined>;
export declare function useShadCNComponentsContext(): {
    Badge: {
        Badge: typeof ShadCNBadge;
    };
    Button: {
        Button: import("react").ForwardRefExoticComponent<import("./components/ui/button.js").ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Card: {
        Card: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
        CardContent: import("react").ForwardRefExoticComponent<import("react").HTMLAttributes<HTMLDivElement> & import("react").RefAttributes<HTMLDivElement>>;
    };
    DropdownMenu: {
        DropdownMenu: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuProps>;
        DropdownMenuCheckboxItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuCheckboxItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuLabel: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuLabelProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSeparator: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSub: import("react").FC<import("@radix-ui/react-dropdown-menu").DropdownMenuSubProps>;
        DropdownMenuSubContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuSubTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-dropdown-menu").DropdownMenuSubTriggerProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
            inset?: boolean | undefined;
        } & import("react").RefAttributes<HTMLDivElement>>;
        DropdownMenuTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-dropdown-menu").DropdownMenuTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Form: {
        Form: <TFieldValues extends import("react-hook-form").FieldValues, TContext = any, TTransformedValues extends import("react-hook-form").FieldValues | undefined = undefined>(props: import("react-hook-form").FormProviderProps<TFieldValues, TContext, TTransformedValues>) => import("react").JSX.Element;
    };
    Input: {
        Input: import("react").ForwardRefExoticComponent<import("./components/ui/input.js").InputProps & import("react").RefAttributes<HTMLInputElement>>;
    };
    Label: {
        Label: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-label").LabelProps & import("react").RefAttributes<HTMLLabelElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: import("class-variance-authority/dist/types.js").ClassProp | undefined) => string> & import("react").RefAttributes<HTMLLabelElement>>;
    };
    Popover: {
        Popover: import("react").FC<import("@radix-ui/react-popover").PopoverProps>;
        PopoverContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-popover").PopoverContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        PopoverTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-popover").PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Select: {
        Select: import("react").FC<import("@radix-ui/react-select").SelectProps>;
        SelectContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectItem: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        SelectTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-select").SelectTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
        SelectValue: import("react").ForwardRefExoticComponent<import("@radix-ui/react-select").SelectValueProps & import("react").RefAttributes<HTMLSpanElement>>;
    };
    Tabs: {
        Tabs: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tabs").TabsProps & import("react").RefAttributes<HTMLDivElement>>;
        TabsContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsList: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsListProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TabsTrigger: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tabs").TabsTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Toggle: {
        Toggle: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-toggle").ToggleProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("class-variance-authority").VariantProps<(props?: ({
            variant?: "default" | "outline" | null | undefined;
            size?: "default" | "sm" | "lg" | null | undefined;
        } & import("class-variance-authority/dist/types.js").ClassProp) | undefined) => string> & import("react").RefAttributes<HTMLButtonElement>>;
    };
    Tooltip: {
        Tooltip: import("react").FC<import("@radix-ui/react-tooltip").TooltipProps>;
        TooltipContent: import("react").ForwardRefExoticComponent<Omit<import("@radix-ui/react-tooltip").TooltipContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
        TooltipProvider: import("react").FC<import("@radix-ui/react-tooltip").TooltipProviderProps>;
        TooltipTrigger: import("react").ForwardRefExoticComponent<import("@radix-ui/react-tooltip").TooltipTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
    };
} | undefined;
