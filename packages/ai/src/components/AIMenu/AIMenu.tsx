import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useMemo, useState } from "react";
import { callLLMStreaming } from "../../api/api";
// import { useAIDictionary } from "../../i18n/useAIDictionary";
import { PromptSuggestionMenu } from "./PromptSuggestionMenu";
import {
  AIMenuSuggestionItem,
  getDefaultAIActionMenuItems,
  getDefaultAIAddMenuItems,
  getDefaultAIEditMenuItems,
} from "./getDefaultAIMenuItems";
import { useBlockNoteAIContext } from "../BlockNoteAIContext";

export const AIMenu = (props: {
  items?: AIMenuSuggestionItem[];
  onManualPromptSubmit?: (prompt: string) => void;
}) => {
  const editor = useBlockNoteEditor();
  const [prompt, setPrompt] = useState("");
  const [aiResponseStatus, setAIResponseStatus] = useState<
    "initial" | "generating" | "done"
  >("initial");
  // const dict = useAIDictionary();

  const ctx = useBlockNoteAIContext();

  // note, technically there might be a bug with this useMemo when quickly changing the selection and opening the menu
  // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
  // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
  const items = useMemo(() => {
    const items =
      props.items || aiResponseStatus !== "initial"
        ? getDefaultAIActionMenuItems(editor, ctx)
        : editor.getSelection()
        ? getDefaultAIEditMenuItems(editor)
        : getDefaultAIAddMenuItems(editor, ctx);

    // map from AI items to React Items required by PromptSuggestionMenu
    return items.map((item) => {
      return {
        ...item,
        onItemClick: () => {
          item.onItemClick(setPrompt, (aiResponseStatus) => {
            setAIResponseStatus(aiResponseStatus);
            if (aiResponseStatus === "initial") {
              ctx.setAiMenuBlockID(undefined);
            }
          });
        },
      };
    });
  }, [props.items, aiResponseStatus, editor, ctx]);

  const onManualPromptSubmitDefault = useCallback(
    async (prompt: string) => {
      setAIResponseStatus("generating");
      await callLLMStreaming(editor, {
        prompt,
      });
      setAIResponseStatus("done");
    },
    [editor]
  );

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
