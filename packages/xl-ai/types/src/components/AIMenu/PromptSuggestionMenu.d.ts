import { DefaultReactSuggestionItem } from "@blocknote/react";
export type PromptSuggestionMenuProps = {
    items: DefaultReactSuggestionItem[];
    onManualPromptSubmit: (prompt: string) => void;
    promptText?: string;
    onPromptTextChange?: (prompt: string) => void;
    placeholder?: string;
    disabled?: boolean;
};
export declare const PromptSuggestionMenu: (props: PromptSuggestionMenuProps) => import("react/jsx-runtime").JSX.Element;
