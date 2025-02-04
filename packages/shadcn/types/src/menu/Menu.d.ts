/// <reference types="react" />
import { ComponentProps } from "@blocknote/react";
export declare const Menu: (props: ComponentProps["Generic"]["Menu"]["Root"]) => import("react/jsx-runtime").JSX.Element;
export declare const MenuTrigger: (props: ComponentProps["Generic"]["Menu"]["Trigger"]) => import("react/jsx-runtime").JSX.Element;
export declare const MenuDropdown: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    children?: import("react").ReactNode;
    sub?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;
export declare const MenuItem: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    children?: import("react").ReactNode;
    subTrigger?: boolean | undefined;
    icon?: import("react").ReactNode;
    checked?: boolean | undefined;
    onClick?: (() => void) | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;
export declare const MenuDivider: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;
export declare const MenuLabel: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    children?: import("react").ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;
