import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useMemo, useState } from "react";
// import { useAIDictionary } from "../../i18n/useAIDictionary";
import { BlockNoteEditor } from "@blocknote/core";
import { useAIDictionary } from "../../i18n/useAIDictionary.js";
import {
  BlockNoteAIContextValue,
  useBlockNoteAIContext,
} from "../BlockNoteAIContext.js";
import { PromptSuggestionMenu } from "./PromptSuggestionMenu.js";
import {
  AIMenuSuggestionItem,
  getDefaultAIActionMenuItems,
  getDefaultAIAddMenuItems,
  getDefaultAIEditMenuItems,
} from "./getDefaultAIMenuItems.js";

export const AIMenu = (props: {
  items?: (
    editor: BlockNoteEditor<any, any, any>,
    ctx: BlockNoteAIContextValue,
    aiResponseStatus: "initial" | "generating" | "done"
  ) => AIMenuSuggestionItem[];
  onManualPromptSubmit?: (prompt: string) => void;
}) => {
  const editor = useBlockNoteEditor();
  const [prompt, setPrompt] = useState("");
  const [aiResponseStatus, setAIResponseStatus] = useState<
    "initial" | "generating" | "done"
  >("initial");
  const dict = useAIDictionary();

  const ctx = useBlockNoteAIContext();

  // note, technically there might be a bug with this useMemo when quickly changing the selection and opening the menu
  // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
  // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
  const items = useMemo(() => {
    let items: AIMenuSuggestionItem[] = [];
    if (props.items) {
      items = props.items(editor, ctx, aiResponseStatus);
    } else {
      if (aiResponseStatus === "initial") {
        items = editor.getSelection()
          ? getDefaultAIEditMenuItems(editor)
          : getDefaultAIAddMenuItems(editor, ctx);
      } else if (aiResponseStatus === "done") {
        items = getDefaultAIActionMenuItems(editor, ctx);
      }
    }

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
      await ctx.callLLM({
        prompt,
      });
      setAIResponseStatus("done");
    },
    [ctx]
  );

  return (
    <PromptSuggestionMenu
      onManualPromptSubmit={
        props.onManualPromptSubmit || onManualPromptSubmitDefault
      }
      items={items}
      promptText={prompt}
      onPromptTextChange={setPrompt}
      placeholder={
        aiResponseStatus === "generating"
          ? "Generating..."
          : dict.formatting_toolbar.ai.input_placeholder
      }
      disabled={aiResponseStatus === "generating"}
    />
  );
};
