import { ChangeEvent, ComponentType, CSSProperties, HTMLInputAutoCompleteAttribute, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { DefaultReactGridSuggestionItem } from "../components/SuggestionMenu/GridSuggestionMenu/types.js";
import { DefaultReactSuggestionItem } from "../components/SuggestionMenu/types.js";
export type ComponentProps = {
    Toolbar: {
        Root: {
            className?: string;
            children?: ReactNode;
            onMouseEnter?: () => void;
            onMouseLeave?: () => void;
        };
        Button: {
            className?: string;
            mainTooltip?: string;
            secondaryTooltip?: string;
            icon?: ReactNode;
            onClick?: (e: MouseEvent) => void;
            isSelected?: boolean;
            isDisabled?: boolean;
        } & ({
            children: ReactNode;
            label?: string;
        } | {
            children?: undefined;
            label: string;
        });
        Select: {
            className?: string;
            items: {
                text: string;
                icon: ReactNode;
                onClick: () => void;
                isSelected: boolean;
                isDisabled?: boolean;
            }[];
            isDisabled?: boolean;
        };
    };
    FilePanel: {
        Root: {
            className?: string;
            tabs: {
                name: string;
                tabPanel: ReactNode;
            }[];
            openTab: string;
            setOpenTab: (name: string) => void;
            defaultOpenTab: string;
            loading: boolean;
        };
        Button: {
            className?: string;
            onClick: () => void;
        } & ({
            children: ReactNode;
            label?: string;
        } | {
            children?: undefined;
            label: string;
        });
        FileInput: {
            className?: string;
            accept: string;
            value: File | null;
            placeholder: string;
            onChange: (payload: File | null) => void;
        };
        TabPanel: {
            className?: string;
            children?: ReactNode;
        };
        TextInput: {
            className?: string;
            value: string;
            placeholder: string;
            onChange: (event: ChangeEvent<HTMLInputElement>) => void;
            onKeyDown: (event: KeyboardEvent) => void;
        };
    };
    SideMenu: {
        Root: {
            className?: string;
            children?: ReactNode;
        };
        Button: {
            className?: string;
            onClick?: (e: MouseEvent) => void;
            icon?: ReactNode;
            onDragStart?: (e: React.DragEvent) => void;
            onDragEnd?: (e: React.DragEvent) => void;
            draggable?: boolean;
        } & ({
            children: ReactNode;
            label?: string;
        } | {
            children?: undefined;
            label: string;
        });
    };
    SuggestionMenu: {
        Root: {
            id: string;
            className?: string;
            children?: ReactNode;
        };
        EmptyItem: {
            className?: string;
            children?: ReactNode;
        };
        Item: {
            className?: string;
            id: string;
            isSelected: boolean;
            onClick: () => void;
            item: Omit<DefaultReactSuggestionItem, "onItemClick">;
        };
        Label: {
            className?: string;
            children?: ReactNode;
        };
        Loader: {
            className?: string;
            children?: ReactNode;
        };
    };
    GridSuggestionMenu: {
        Root: {
            id: string;
            columns: number;
            className?: string;
            children?: ReactNode;
        };
        EmptyItem: {
            columns: number;
            className?: string;
            children?: ReactNode;
        };
        Item: {
            className?: string;
            id: string;
            isSelected: boolean;
            onClick: () => void;
            item: DefaultReactGridSuggestionItem;
        };
        Loader: {
            columns: number;
            className?: string;
            children?: ReactNode;
        };
    };
    TableHandle: {
        Root: {
            className?: string;
            draggable: boolean;
            onDragStart: (e: React.DragEvent) => void;
            onDragEnd: () => void;
            style?: CSSProperties;
        } & ({
            children: ReactNode;
            label?: string;
        } | {
            children?: undefined;
            label: string;
        });
        ExtendButton: {
            className?: string;
            onClick: (e: React.MouseEvent) => void;
            onMouseDown: (e: React.MouseEvent) => void;
            children: ReactNode;
        };
    };
    Generic: {
        Form: {
            Root: {
                children?: ReactNode;
            };
            TextInput: {
                className?: string;
                name: string;
                label?: string;
                variant?: "default" | "large";
                icon: ReactNode;
                autoFocus?: boolean;
                placeholder?: string;
                disabled?: boolean;
                value: string;
                onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
                onChange: (event: ChangeEvent<HTMLInputElement>) => void;
                onSubmit?: () => void;
                autoComplete?: HTMLInputAutoCompleteAttribute;
            };
        };
        Menu: {
            Root: {
                sub?: boolean;
                position?: "top" | "right" | "bottom" | "left";
                onOpenChange?: (open: boolean) => void;
                children?: ReactNode;
            };
            Divider: {
                className?: string;
            };
            Dropdown: {
                className?: string;
                children?: ReactNode;
                sub?: boolean;
            };
            Item: {
                className?: string;
                children?: ReactNode;
                subTrigger?: boolean;
                icon?: ReactNode;
                checked?: boolean;
                onClick?: () => void;
            };
            Label: {
                className?: string;
                children?: ReactNode;
            };
            Trigger: {
                children?: ReactNode;
                sub?: boolean;
            };
        };
        Popover: {
            Root: {
                children?: ReactNode;
                opened?: boolean;
                position?: "top" | "right" | "bottom" | "left";
            };
            Content: {
                className?: string;
                variant: "form-popover" | "panel-popover";
                children?: ReactNode;
            };
            Trigger: {
                children?: ReactNode;
            };
        };
    };
};
export type Components = {
    [Components in keyof Omit<ComponentProps, "Generic">]: {
        [Component in keyof ComponentProps[Components]]: ComponentType<ComponentProps[Components][Component]>;
    };
} & {
    Generic: {
        [GenericComponents in keyof ComponentProps["Generic"]]: {
            [Component in keyof ComponentProps["Generic"][GenericComponents]]: ComponentType<ComponentProps["Generic"][GenericComponents][Component]>;
        };
    };
};
export declare const ComponentsContext: import("react").Context<Components | undefined>;
export declare function useComponentsContext(): Components | undefined;
