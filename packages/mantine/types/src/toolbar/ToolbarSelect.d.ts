/// <reference types="react" />
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
