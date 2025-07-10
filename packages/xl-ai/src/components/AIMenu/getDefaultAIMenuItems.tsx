import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import {
  RiArrowGoBackFill,
  RiBallPenLine,
  RiCheckFill,
  RiCheckLine,
  RiEarthLine,
  RiListCheck3,
  RiLoopLeftFill,
  RiMagicLine,
  RiText,
  RiTextWrap,
} from "react-icons/ri";

import { getAIExtension } from "../../AIExtension.js";
import { getAIDictionary } from "../../i18n/dictionary.js";

export type AIMenuSuggestionItem = Omit<
  DefaultReactSuggestionItem,
  "onItemClick"
> & {
  onItemClick: (setPrompt: (userPrompt: string) => void) => void;
  key: string;
};

/**
 * Default items we show in the AI Menu when there is no selection active.
 * For example, when the AI menu is triggered via the slash menu
 */
function getDefaultAIMenuItemsWithoutSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const ai = getAIExtension(editor);
  return [
    {
      key: "continue_writing",
      title: dict.ai_default_commands.continue_writing.title,
      aliases: dict.ai_default_commands.continue_writing.aliases,
      icon: <RiBallPenLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          userPrompt:
            "Continue writing at the current cursor position related to the previous text. Add multiple blocks if needed. If the document looks like a template / draft, follow the template. Be extensive if needed.",
          // By default, LLM will be able to add / update / delete blocks. For "continue writing", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: true,
            delete: false,
            update: false,
          },
        });
      },
      size: "small",
    },

    {
      key: "summarize",
      title: dict.ai_default_commands.summarize.title,
      aliases: dict.ai_default_commands.summarize.aliases,
      icon: <RiTextWrap size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          userPrompt: "Summarize",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: true,
            delete: false,
            update: false,
          },
        });
      },
      size: "small",
    },
    {
      key: "action_items",
      title: dict.ai_default_commands.add_action_items.title,
      aliases: dict.ai_default_commands.add_action_items.aliases,
      icon: <RiListCheck3 size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          userPrompt: "Add action items",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: true,
            delete: false,
            update: false,
          },
        });
      },
      size: "small",
    },
    {
      key: "write_anything",
      title: dict.ai_default_commands.write_anything.title,
      aliases: dict.ai_default_commands.write_anything.aliases,
      icon: <RiBallPenLine size={18} />,
      onItemClick: (setPrompt) => {
        setPrompt(dict.ai_default_commands.write_anything.prompt_placeholder);
      },
      size: "small",
    },
  ];
}

/**
 * Default items we show in the AI Menu when there is a selection active.
 * For example, when the AI menu is triggered via formatting toolbar (AIToolbarButton)
 */
function getDefaultAIMenuItemsWithSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);

  const ai = getAIExtension(editor);

  return [
    {
      key: "improve_writing",
      title: dict.ai_default_commands.improve_writing.title,
      aliases: dict.ai_default_commands.improve_writing.aliases,
      icon: <RiText size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          userPrompt: "Improve writing",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: false,
            delete: false,
            update: true,
          },
        });
      },
      size: "small",
    },
    {
      key: "fix_spelling",
      title: dict.ai_default_commands.fix_spelling.title,
      aliases: dict.ai_default_commands.fix_spelling.aliases,
      icon: <RiCheckLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          userPrompt: "Fix spelling",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: false,
            delete: false,
            update: true,
          },
        });
      },
      size: "small",
    },
    {
      key: "translate",
      title: dict.ai_default_commands.translate.title,
      aliases: dict.ai_default_commands.translate.aliases,
      icon: <RiEarthLine size={18} />,
      onItemClick: (setPrompt) => {
        setPrompt(dict.ai_default_commands.translate.prompt_placeholder);
      },
      size: "small",
    },
    {
      key: "simplify",
      title: dict.ai_default_commands.simplify.title,
      aliases: dict.ai_default_commands.simplify.aliases,
      icon: <RiMagicLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          userPrompt: "Simplify",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          defaultStreamTools: {
            add: false,
            delete: false,
            update: true,
          },
        });
      },
      size: "small",
    },
  ];
}

/**
 * Default items we show in the AI Menu when the AI response is done.
 */
function getDefaultAIMenuItemsForReview<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const ai = getAIExtension(editor);

  return [
    {
      key: "accept",
      title: dict.ai_menu.actions.accept.title,
      aliases: dict.ai_menu.actions.accept.aliases,
      icon: <RiCheckFill size={18} />,
      onItemClick: () => {
        ai.acceptChanges();
      },
      size: "small",
    },
    {
      key: "revert",
      title: dict.ai_menu.actions.revert.title,
      aliases: dict.ai_menu.actions.revert.aliases,
      icon: <RiArrowGoBackFill size={18} />,
      onItemClick: () => {
        ai.rejectChanges();
      },
      size: "small",
    },
  ];
}

/**
 * Default items we show in the AI Menu when the AI response is done.
 */
function getDefaultAIMenuItemsForError<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const ai = getAIExtension(editor);

  return [
    {
      key: "retry",
      title: dict.ai_menu.actions.retry.title,
      aliases: dict.ai_menu.actions.retry.aliases,
      icon: <RiLoopLeftFill size={18} />,
      onItemClick: async () => {
        await ai.retry();
      },
      size: "small",
    },
    {
      key: "cancel",
      title: dict.ai_menu.actions.cancel.title,
      aliases: dict.ai_menu.actions.cancel.aliases,
      icon: <RiArrowGoBackFill size={18} />,
      onItemClick: () => {
        ai.rejectChanges();
      },
      size: "small",
    },
  ];
}

export function getDefaultAIMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  aiResponseStatus:
    | "user-input"
    | "thinking"
    | "ai-writing"
    | "error"
    | "user-reviewing"
    | "closed",
): AIMenuSuggestionItem[] {
  if (aiResponseStatus === "user-input") {
    return editor.getSelection()
      ? getDefaultAIMenuItemsWithSelection(editor)
      : getDefaultAIMenuItemsWithoutSelection(editor);
  } else if (aiResponseStatus === "user-reviewing") {
    return getDefaultAIMenuItemsForReview(editor);
  } else if (aiResponseStatus === "error") {
    return getDefaultAIMenuItemsForError(editor);
  } else {
    return [];
  }
}
