/// <reference types="react" />
export declare const Panel: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    tabs: {
        name: string;
        tabPanel: import("react").ReactNode;
    }[];
    openTab: string;
    setOpenTab: (name: string) => void;
    defaultOpenTab: string;
    loading: boolean;
} & import("react").RefAttributes<HTMLDivElement>>;
