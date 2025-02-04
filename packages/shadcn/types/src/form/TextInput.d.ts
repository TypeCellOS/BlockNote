/// <reference types="react" />
export declare const TextInput: import("react").ForwardRefExoticComponent<{
    className?: string | undefined;
    name: string;
    label?: string | undefined;
    variant?: "default" | "large" | undefined;
    icon: import("react").ReactNode;
    autoFocus?: boolean | undefined;
    placeholder?: string | undefined;
    disabled?: boolean | undefined;
    value: string;
    onKeyDown: (event: import("react").KeyboardEvent<HTMLInputElement>) => void;
    onChange: (event: import("react").ChangeEvent<HTMLInputElement>) => void;
    onSubmit?: (() => void) | undefined;
    autoComplete?: import("react").HTMLInputAutoCompleteAttribute | undefined;
} & import("react").RefAttributes<HTMLInputElement>>;
