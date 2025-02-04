/// <reference types="react" />
export declare const SideMenuButton: import("react").ForwardRefExoticComponent<({
    className?: string | undefined;
    onClick?: ((e: import("react").MouseEvent<Element, MouseEvent>) => void) | undefined;
    icon?: import("react").ReactNode;
    onDragStart?: ((e: import("react").DragEvent<Element>) => void) | undefined;
    onDragEnd?: ((e: import("react").DragEvent<Element>) => void) | undefined;
    draggable?: boolean | undefined;
} & ({
    children: import("react").ReactNode;
    label?: string | undefined;
} | {
    children?: undefined;
    label: string;
})) & import("react").RefAttributes<HTMLButtonElement>>;
