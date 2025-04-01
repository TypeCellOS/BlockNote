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
  onItemClick: (setPrompt: (prompt: string) => void) => void;
};

/**
 * Default items we show in the AI Menu when there is no selection active.
 * For example, when the AI menu is triggered via the slash menu
 */
export function getDefaultAIMenuItemsWithoutSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const ai = getAIExtension(editor);
  return [
    {
      key: "continue_writing",
      title: dict.ai_menu.continue_writing.title,
      aliases: dict.ai_menu.continue_writing.aliases,
      icon: <RiBallPenLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          prompt: "Continue writing",
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
      title: dict.ai_menu.summarize.title,
      aliases: dict.ai_menu.summarize.aliases,
      icon: <RiTextWrap size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          prompt: "Summarize",
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
      title: dict.ai_menu.add_action_items.title,
      aliases: dict.ai_menu.add_action_items.aliases,
      icon: <RiListCheck3 size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          prompt: "Add action items",
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
      title: dict.ai_menu.write_anything.title,
      aliases: dict.ai_menu.write_anything.aliases,
      icon: <RiBallPenLine size={18} />,
      onItemClick: (setPrompt) => {
        setPrompt(dict.ai_menu.write_anything.prompt_placeholder);
      },
      size: "small",
    },
  ];
}

/**
 * Default items we show in the AI Menu when there is a selection active.
 * For example, when the AI menu is triggered via formatting toolbar (AIToolbarButton)
 */
export function getDefaultAIMenuItemsWithSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);

  const ai = getAIExtension(editor);

  return [
    {
      key: "improve_writing",
      title: dict.ai_menu.improve_writing.title,
      aliases: dict.ai_menu.improve_writing.aliases,
      icon: <RiText size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          prompt: "Improve writing",
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
      title: dict.ai_menu.fix_spelling.title,
      aliases: dict.ai_menu.fix_spelling.aliases,
      icon: <RiCheckLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          prompt: "Fix spelling",
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
      title: dict.ai_menu.translate.title,
      aliases: dict.ai_menu.translate.aliases,
      icon: <RiEarthLine size={18} />,
      onItemClick: (setPrompt) => {
        setPrompt(dict.ai_menu.translate.prompt_placeholder);
      },
      size: "small",
    },
    {
      key: "simplify",
      title: dict.ai_menu.simplify.title,
      aliases: dict.ai_menu.simplify.aliases,
      icon: <RiMagicLine size={18} />,
      onItemClick: async () => {
        await ai.callLLM({
          useSelection: true,
          prompt: "Simplify",
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
export function getDefaultAIActionMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const ai = getAIExtension(editor);

  return [
    {
      key: "accept",
      title: dict.ai_menu.accept.title,
      aliases: dict.ai_menu.accept.aliases,
      icon: <RiCheckFill size={18} />,
      onItemClick: () => {
        ai.acceptChanges();
      },
      size: "small",
    },
    // TODO: retry UX
    // {
    //   key: "retry",
    //   title: dict.ai_menu.retry.title,
    //   aliases: dict.ai_menu.retry.aliases,
    //   icon: <RiLoopLeftFill size={18} />,
    //   onItemClick: () => {
    //     console.log("RETRY");
    //   },
    //   size: "small",
    // },
    {
      key: "revert",
      title: dict.ai_menu.revert.title,
      aliases: dict.ai_menu.revert.aliases,
      icon: <RiArrowGoBackFill size={18} />,
      onItemClick: () => {
        ai.rejectChanges();
      },
      size: "small",
    },
  ];
}

/**
3 examples:

input:
- pass schema / blocks / functions

1) block -> markdown, markdown -> block
2) pass entire document
3) functions (updateBlock, insertBlock, deleteBlock)


response:
- markdown
- entire document (text stream)
- entire document (block call streams)
 * 
 */

// const context = createAIExecutionContext(editor, prompt, () = {
//   // add ai command
//   // add context

//   // apply streaming response
//   context.execute();
// });
// aitoolbar.open(context);
