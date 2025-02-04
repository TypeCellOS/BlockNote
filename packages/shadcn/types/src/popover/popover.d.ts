/// <reference types="react" />
import { ComponentProps } from "@blocknote/react";
export declare const Popover: (props: ComponentProps["Generic"]["Popover"]["Root"]) => import("react/jsx-runtime").JSX.Element;
export declare const PopoverTrigger: import("react").ForwardRefExoticComponent<{
    children?: import("react").ReactNode;
} & import("react").RefAttributes<unknown>>;
export declare const PopoverContent: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    variant: "form-popover" | "panel-popover";
    children?: import("react").ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;
