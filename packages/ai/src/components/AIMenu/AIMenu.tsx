import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useMemo } from "react";
import { useAIDictionary } from "../../i18n/useAIDictionary";
import { PromptSuggestionMenu } from "./PromptSuggestionMenu";
import {
  AIMenuSuggestionItem,
  getDefaultAIMenuItems,
} from "./getDefaultAIMenuItems";

export const AIMenu = (props: {
  items?: AIMenuSuggestionItem[];
  onManualPromptSubmit?: (prompt: string) => void;
}) => {
  const editor = useBlockNoteEditor();
  const dict = useAIDictionary();

  const items = useMemo(() => {
    // note, technically there might be a bug when quickly changing the selection and opening the menu
    // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
    // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
    return props.items || getDefaultAIMenuItems(editor);
  }, [props.items, editor]);

  const onManualPromptSubmitDefault = useCallback((prompt: string) => {
    // TODO
  }, []);

  return (
    <PromptSuggestionMenu
      onManualPromptSubmit={
        props.onManualPromptSubmit || onManualPromptSubmitDefault
      }
      items={items}
    />
  );
};
