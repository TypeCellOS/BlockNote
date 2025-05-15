import { BlockNoteEditor } from "@blocknote/core";
import { useBlockNoteEditor, useComponentsContext } from "@blocknote/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";
import { useStore } from "zustand";

import { getAIExtension } from "../../AIExtension.js";
import { useAIDictionary } from "../../i18n/useAIDictionary.js";
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
    aiResponseStatus:
      | "user-input"
      | "thinking"
      | "ai-writing"
      | "error"
      | "user-reviewing"
      | "closed",
  ) => AIMenuSuggestionItem[];
  onManualPromptSubmit?: (userPrompt: string) => void;
}) => {
  const editor = useBlockNoteEditor();
  const [prompt, setPrompt] = useState("");
  const dict = useAIDictionary();

  const Components = useComponentsContext()!;

  const ai = getAIExtension(editor);

  const aiResponseStatus = useStore(ai.store, (state) =>
    state.aiMenuState !== "closed" ? state.aiMenuState.status : "closed",
  );

  const { items: externalItems } = props;
  // note, technically there might be a bug with this useMemo when quickly changing the selection and opening the menu
  // would not call getDefaultAIMenuItems with the correct selection, because the component is reused and the memo not retriggered
  // practically this should not happen (you can test it by using a high transition duration in useUIElementPositioning)
  const items = useMemo(() => {
    let items: AIMenuSuggestionItem[] = [];
    if (externalItems) {
      items = externalItems(editor, aiResponseStatus);
    } else {
      if (aiResponseStatus === "user-input") {
        items = editor.getSelection()
          ? getDefaultAIMenuItemsWithSelection(editor)
          : getDefaultAIMenuItemsWithoutSelection(editor);
      } else if (aiResponseStatus === "user-reviewing") {
        items = getDefaultAIActionMenuItems(editor);
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
  }, [externalItems, aiResponseStatus, editor]);

  const onManualPromptSubmitDefault = useCallback(
    async (userPrompt: string) => {
      await ai.callLLM({
        userPrompt,
        useSelection: editor.getSelection() !== undefined,
      });
    },
    [ai, editor],
  );

  useEffect(() => {
    // TODO: this is a bit hacky to run a useeffect to reset the prompt when the AI response is done
    if (aiResponseStatus === "user-reviewing") {
      setPrompt("");
    }
  }, [aiResponseStatus]);

  const placeholder = useMemo(() => {
    if (aiResponseStatus === "thinking") {
      return dict.formatting_toolbar.ai.thinking;
    } else if (aiResponseStatus === "ai-writing") {
      return dict.formatting_toolbar.ai.editing;
    } else if (aiResponseStatus === "error") {
      return dict.formatting_toolbar.ai.error;
    }

    return dict.formatting_toolbar.ai.input_placeholder;
  }, [aiResponseStatus, dict]);

  const rightSection = useMemo(() => {
    if (aiResponseStatus === "thinking" || aiResponseStatus === "ai-writing") {
      return (
        <Components.SuggestionMenu.Loader
          className={"bn-suggestion-menu-loader bn-combobox-right-section"}
        />
      );
    } else if (aiResponseStatus === "error") {
      return (
        <div className={"bn-combobox-right-section bn-combobox-error"}>
          <span>!</span>
        </div>
      );
    }

    return undefined;
  }, [Components, aiResponseStatus]);

  return (
    <PromptSuggestionMenu
      onManualPromptSubmit={
        props.onManualPromptSubmit || onManualPromptSubmitDefault
      }
      items={items}
      promptText={prompt}
      onPromptTextChange={setPrompt}
      placeholder={placeholder}
      disabled={
        aiResponseStatus === "thinking" ||
        aiResponseStatus === "ai-writing" ||
        aiResponseStatus === "error"
      }
      icon={
        <div className="bn-combobox-icon">
          <RiSparkling2Fill />
        </div>
      }
      rightSection={rightSection}
    />
  );
};
