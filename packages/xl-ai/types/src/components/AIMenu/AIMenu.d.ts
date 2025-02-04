import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteAIContextValue } from "../BlockNoteAIContext.js";
import { AIMenuSuggestionItem } from "./getDefaultAIMenuItems.js";
export declare const AIMenu: (props: {
    items?: (editor: BlockNoteEditor<any, any, any>, ctx: BlockNoteAIContextValue, aiResponseStatus: "initial" | "generating" | "done") => AIMenuSuggestionItem[];
    onManualPromptSubmit?: (prompt: string) => void;
}) => import("react/jsx-runtime").JSX.Element;
