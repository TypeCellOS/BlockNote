import {
  BlockSchema,
  filterSuggestionItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  DefaultReactSuggestionItem,
  useComponentsContext,
  useSuggestionMenuKeyboardHandler,
} from "@blocknote/react";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useBlockNoteEditor } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";
import { streamDocumentOperations } from "../../../api/api";
import { AIMenuProsemirrorPlugin } from "../../../core";
import { useAIDictionary } from "../../hooks/useAIDictionary";
import { AIMenuProps } from "./AIMenuProps";
import { getDefaultAIMenuItems } from "./getDefaultAIMenuItems";

export const AIMenu = (props: AIMenuProps) => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<string>("");

  const runAIEdit = useCallback(
    async (prompt: string) => {
      await streamDocumentOperations(editor, prompt);
      // editor.formattingToolbar.closeMenu();
      // (
      //   editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
      // ).open(prompt, "replaceSelection");
    },
    [editor]
  );

  const handleEnter = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).close();
        await runAIEdit(currentEditingPrompt);
      }
    },
    [currentEditingPrompt, editor.extensions.aiMenu, runAIEdit]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingPrompt(event.currentTarget.value),
    []
  );

  const items: DefaultReactSuggestionItem[] = useMemo(
    () =>
      filterSuggestionItems(
        props.items || getDefaultAIMenuItems(editor, "insertAfterSelection"),
        currentEditingPrompt
      ),
    [currentEditingPrompt, editor, props.items]
  );

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (items.length > 0) {
          handler(event);
        } else {
          // TODO: check focus?
          handleEnter(event);
        }
      } else {
        handler(event);
      }
    },
    [handleEnter, handler, items.length]
  );

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [currentEditingPrompt, setSelectedIndex]);

  return (
    <div className={"bn-ai-menu"}>
      <Components.Generic.Form.Root>
        <Components.Generic.Form.TextInput
          className={"bn-ai-menu-input"}
          name={"ai-prompt"}
          icon={<RiSparkling2Fill />}
          value={currentEditingPrompt || ""}
          autoFocus={true}
          placeholder={dict.formatting_toolbar.ai.input_placeholder}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
        />
      </Components.Generic.Form.Root>
      <Components.SuggestionMenu.Root
        className={"bn-ai-menu-items"}
        id={"ai-suggestion-menu"}>
        {items.map((item, index) => (
          <Components.SuggestionMenu.Item
            key={item.name}
            className={"bn-suggestion-menu-item"}
            id={item.name}
            isSelected={index === selectedIndex}
            onClick={item.onItemClick}
            item={item}
          />
        ))}
      </Components.SuggestionMenu.Root>
    </div>
  );
};
