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
    if (aiResponseStatus === "thinking") {
      return dict.ai_menu.status.thinking;
    } else if (aiResponseStatus === "ai-writing") {
      return dict.ai_menu.status.editing;
    } else if (aiResponseStatus === "error") {
      return dict.ai_menu.status.error;
    }

    return dict.ai_menu.input_placeholder;
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
          {/* Taken from Google Material Icons */}
          {/* https://fonts.google.com/icons?selected=Material+Symbols+Rounded:error:FILL@0;wght@400;GRAD@0;opsz@24&icon.query=error&icon.size=24&icon.color=%23e8eaed&icon.set=Material+Symbols&icon.style=Rounded&icon.platform=web */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="1em"
            viewBox="0 -960 960 960"
            width="1em"
            fill="currentColor"
          >
            <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
          </svg>
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
        aiResponseStatus === "thinking" || aiResponseStatus === "ai-writing"
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
