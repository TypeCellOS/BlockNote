/// <reference types="react" />
export declare const TableHandle: import("react").ForwardRefExoticComponent<({
    className?: string | undefined;
    draggable: boolean;
    onDragStart: (e: import("react").DragEvent<Element>) => void;
    onDragEnd: () => void;
    style?: import("react").CSSProperties | undefined;
} & ({
    children: import("react").ReactNode;
    label?: string | undefined;
} | {
    children?: undefined;
    label: string;
})) & import("react").RefAttributes<HTMLButtonElement>>;
