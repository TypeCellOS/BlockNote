import { BlockNoteEditor } from "@blocknote/core";
import { useBlockNoteEditor, useComponentsContext } from "@blocknote/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiErrorWarningFill,
  RiSparkling2Fill,
  RiStopCircleFill,
} from "react-icons/ri";
import { useStore } from "zustand";

import { getAIExtension } from "../../AIExtension.js";
import { useAIDictionary } from "../../i18n/useAIDictionary.js";
import { PromptSuggestionMenu } from "./PromptSuggestionMenu.js";
import {
  AIMenuSuggestionItem,
  getDefaultAIMenuItems,
} from "./getDefaultAIMenuItems.js";

export type AIMenuProps = {
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
};

export const AIMenu = (props: AIMenuProps) => {
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
      items = getDefaultAIMenuItems(editor, aiResponseStatus);
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
    // this is a bit hacky to run a useeffect to reset the prompt when the AI response is done
    if (aiResponseStatus === "user-reviewing" || aiResponseStatus === "error") {
      setPrompt("");
    }
  }, [aiResponseStatus]);

  const placeholder = useMemo(() => {
    if (aiResponseStatus === "error") {
      return dict.ai_menu.status.error;
    }

    return dict.ai_menu.input_placeholder;
  }, [aiResponseStatus, dict]);

  return (
    <PromptSuggestionMenu
      items={items}
      inputProps={{
        value: prompt,
        onChange: (e) => setPrompt(e.target.value),
        onSubmit: () =>
          props.onManualPromptSubmit?.(prompt) ||
          onManualPromptSubmitDefault(prompt),
        placeholder,
      }}
      loader={
        <div className={"bn-ai-loader"}>
          <span className={"bn-ai-loader-text"}>
            {aiResponseStatus === "ai-writing"
              ? dict.ai_menu.status.editing
              : dict.ai_menu.status.thinking}
          </span>
          <Components.SuggestionMenu.Loader
            className={"bn-ai-loader-icon bn-suggestion-menu-loader"}
          />
        </div>
      }
      isLoading={
        aiResponseStatus === "thinking" || aiResponseStatus === "ai-writing"
      }
      leftSection={
        <div className={"bn-ai-icon"}>
          <RiSparkling2Fill />
        </div>
      }
      rightSection={
        aiResponseStatus === "thinking" || aiResponseStatus === "ai-writing" ? (
          <div className={"bn-ai-stop"}>
            <RiStopCircleFill />
          </div>
        ) : aiResponseStatus === "error" ? (
          <div className={"bn-ai-error"} onClick={() => ai.abort()}>
            <RiErrorWarningFill />
          </div>
        ) : undefined
      }
    />
  );
};
