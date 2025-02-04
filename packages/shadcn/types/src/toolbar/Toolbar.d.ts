/// <reference types="react" />
export declare const Toolbar: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    children?: import("react").ReactNode;
    onMouseEnter?: (() => void) | undefined;
    onMouseLeave?: (() => void) | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;
export declare const ToolbarButton: import("react").ForwardRefExoticComponent<({
    className?: string | undefined;
    mainTooltip?: string | undefined;
    secondaryTooltip?: string | undefined;
    icon?: import("react").ReactNode;
    onClick?: ((e: import("react").MouseEvent<Element, MouseEvent>) => void) | undefined;
    isSelected?: boolean | undefined;
    isDisabled?: boolean | undefined;
} & ({
    children: import("react").ReactNode;
    label?: string | undefined;
} | {
    children?: undefined;
    label: string;
})) & import("react").RefAttributes<HTMLButtonElement>>;
export declare const ToolbarSelect: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    items: {
        text: string;
        icon: import("react").ReactNode;
        onClick: () => void;
        isSelected: boolean;
        isDisabled?: boolean | undefined;
    }[];
    isDisabled?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;
