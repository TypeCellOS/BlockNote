/// <reference types="react" />
import { ComponentProps } from "@blocknote/react";
export declare const Popover: (props: ComponentProps["Generic"]["Popover"]["Root"]) => import("react/jsx-runtime").JSX.Element;
export declare const PopoverTrigger: (props: ComponentProps["Generic"]["Popover"]["Trigger"]) => import("react/jsx-runtime").JSX.Element;
export declare const PopoverContent: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    variant: "form-popover" | "panel-popover";
    children?: import("react").ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;
