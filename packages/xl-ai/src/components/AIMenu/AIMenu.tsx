import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  getDefaultAIMenuItemsWithSelection,
  getDefaultAIMenuItemsWithoutSelection,
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
  const dict = useAIDictionary();

  const ctx = useBlockNoteAIContext();

  const { aiResponseStatus } = ctx;
  const { items: externalItems } = props;
  // note, technically there might be a bug with this useMemo when quickly changing the selection and opening the menu
  // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
  // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
  const items = useMemo(() => {
    let items: AIMenuSuggestionItem[] = [];
    if (externalItems) {
      items = externalItems(editor, ctx, aiResponseStatus);
    } else {
      if (aiResponseStatus === "initial") {
        items = editor.getSelection()
          ? getDefaultAIMenuItemsWithSelection(editor)
          : getDefaultAIMenuItemsWithoutSelection(editor, ctx);
      } else if (ctx.aiResponseStatus === "done") {
        items = getDefaultAIActionMenuItems(editor, ctx);
      }
    }

    // map from AI items to React Items required by PromptSuggestionMenu
    return items.map((item) => {
      return {
        ...item,
        onItemClick: () => {
          item.onItemClick(setPrompt);
        },
      };
    });
  }, [externalItems, aiResponseStatus, editor, ctx]);

  const onManualPromptSubmitDefault = useCallback(
    async (prompt: string) => {
      await ctx.callLLM({
        prompt,
      });
    },
    [ctx]
  );

  useEffect(() => {
    // TODO: this is a bit hacky to run a useeffect to reset the prompt when the AI response is done
    if (aiResponseStatus === "done") {
      setPrompt("");
    }
  }, [aiResponseStatus]);

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
