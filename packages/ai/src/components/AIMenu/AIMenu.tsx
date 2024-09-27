import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useMemo, useState } from "react";
import { callLLMStreaming } from "../../api/api";
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
  const [prompt, setPrompt] = useState("");
  const [aiInProgress, setAIInProgress] = useState(false);
  const dict = useAIDictionary();

  // note, technically there might be a bug with this useMemo when quickly changing the selection and opening the menu
  // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
  // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
  const items = useMemo(() => {
    // map from AI items to React Items required by PromptSuggestionMenu
    const items = (props.items || getDefaultAIMenuItems(editor)).map((item) => {
      return {
        ...item,
        onItemClick: () => {
          item.onItemClick(setPrompt, setAIInProgress);
        },
      };
    });

    return items;
  }, [props.items, editor]);

  const onManualPromptSubmitDefault = useCallback(
    (prompt: string) => {
      callLLMStreaming(editor, {
        prompt,
      });
      setAIInProgress(true);
    },
    [editor]
  );

  if (aiInProgress) {
    return <div>AI in progress</div>;
  }

  return (
    <PromptSuggestionMenu
      onManualPromptSubmit={
        props.onManualPromptSubmit || onManualPromptSubmitDefault
      }
      items={items}
      promptText={prompt}
      onPromptTextChange={setPrompt}
    />
  );
};
