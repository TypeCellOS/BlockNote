/// <reference types="react" />
export declare const PanelButton: import("react").ForwardRefExoticComponent<({
    className?: string | undefined;
    onClick: () => void;
} & ({
    children: import("react").ReactNode;
    label?: string | undefined;
} | {
    children?: undefined;
    label: string;
})) & import("react").RefAttributes<HTMLButtonElement>>;
