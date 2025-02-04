/// <reference types="react" />
export declare const TooltipContent: (props: {
    mainTooltip: string;
    secondaryTooltip?: string;
}) => import("react/jsx-runtime").JSX.Element;
/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
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
