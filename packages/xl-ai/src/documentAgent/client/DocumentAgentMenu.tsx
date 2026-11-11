import type { BlockNoteEditor } from "@blocknote/core";
import { useBlockNoteEditor, useExtension } from "@blocknote/react";
import { useCallback } from "react";
import {
  RiArrowGoBackFill,
  RiCheckFill,
  RiCheckLine,
  RiMagicLine,
  RiStopCircleLine,
  RiTextWrap,
} from "react-icons/ri";

import { AIMenu, type AIMenuProps } from "../../components/AIMenu/AIMenu.js";
import type { AIMenuSuggestionItem } from "../../components/AIMenu/getDefaultAIMenuItems.js";
import { getAIDictionary } from "../../i18n/dictionary.js";
import { DocumentAgentExtension } from "./DocumentAgentExtension.js";

type MenuStatus = Parameters<NonNullable<AIMenuProps["items"]>>[1];

/**
 * The AI menu for the document agent: the menu of the old engine
 * (`AIMenu`), with items that call the document agent. Give it to
 * `AIMenuController` as `aiMenu`.
 */
export function DocumentAgentMenu() {
  const editor = useBlockNoteEditor();
  const agent = useExtension(DocumentAgentExtension);

  const submit = useCallback(
    (prompt: string) => {
      void agent.invoke(withSelection(editor, prompt));
    },
    [agent, editor],
  );

  return (
    <AIMenu items={documentAgentMenuItems} onManualPromptSubmit={submit} />
  );
}

/** The items of the AI menu for each state of a run of the document agent. */
export function documentAgentMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  status: MenuStatus,
): AIMenuSuggestionItem[] {
  const agent = editor.getExtension(DocumentAgentExtension);
  if (agent === undefined) {
    return [];
  }
  const dict = getAIDictionary(editor);

  function promptItem(
    key: string,
    title: string,
    prompt: string,
    icon: AIMenuSuggestionItem["icon"],
  ): AIMenuSuggestionItem {
    return {
      key,
      title,
      icon,
      size: "small",
      onItemClick: () => {
        void agent?.invoke(withSelection(editor, prompt));
      },
    };
  }

  switch (status) {
    case "user-input":
      return [
        promptItem(
          "improve_writing",
          dict.ai_default_commands.improve_writing.title,
          "Improve the writing. Keep the meaning and the structure.",
          <RiMagicLine size={18} />,
        ),
        promptItem(
          "fix_spelling",
          dict.ai_default_commands.fix_spelling.title,
          "Fix the spelling and the grammar. Change nothing else.",
          <RiCheckLine size={18} />,
        ),
        promptItem(
          "summarize",
          dict.ai_default_commands.summarize.title,
          "Add a short summary at the end of the document.",
          <RiTextWrap size={18} />,
        ),
      ];
    case "thinking":
    case "ai-writing":
      return [
        {
          key: "cancel",
          title: dict.ai_menu.actions.cancel.title,
          icon: <RiStopCircleLine size={18} />,
          size: "small",
          onItemClick: () => {
            void agent.abort();
          },
        },
      ];
    case "user-reviewing":
    case "error":
      return [
        {
          key: "accept",
          title: dict.ai_menu.actions.accept.title,
          icon: <RiCheckFill size={18} />,
          size: "small",
          onItemClick: () => agent.acceptAll(),
        },
        {
          key: "revert",
          title: dict.ai_menu.actions.revert.title,
          icon: <RiArrowGoBackFill size={18} />,
          size: "small",
          onItemClick: () => agent.rejectAll(),
        },
      ];
    case "closed":
      return [];
    default:
      return status satisfies never;
  }
}

/**
 * The prompt, with the text that the user selected. The agent reads the
 * document as markdown, without the selection of the user. Thus, the
 * prompt quotes the selected text.
 */
function withSelection(
  editor: BlockNoteEditor<any, any, any>,
  prompt: string,
): string {
  const selected =
    editor.getSelection() === undefined ? "" : editor.getSelectedText().trim();
  return selected === ""
    ? prompt
    : `${prompt}\n\nThe user selected this text of the document. Apply the request to this part only:\n"""\n${selected}\n"""`;
}
