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
import { callLLMStreaming } from "../../api/api.js";
import { addFunction } from "../../api/functions/add.js";
import { getAIDictionary } from "../../i18n/dictionary.js";
import { BlockNoteAIContextValue } from "../BlockNoteAIContext.js";

export type AIMenuSuggestionItem = Omit<
  DefaultReactSuggestionItem,
  "onItemClick"
> & {
  onItemClick: (
    setPrompt: (prompt: string) => void,
    setAIResponseStatus: (
      aiResponseStatus: "initial" | "generating" | "done"
    ) => void
  ) => void;
};

export function getDefaultAIAddMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  contextValue: BlockNoteAIContextValue
): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);

  return [
    {
      key: "continue_writing",
      title: dict.ai_menu.continue_writing.title,
      aliases: dict.ai_menu.continue_writing.aliases,
      icon: <RiBallPenLine size={18} />,
      onItemClick: () => {
        callLLMStreaming(editor, {
          prompt: "Continue writing",
          // By default, LLM will be able to add / update / delete blocks. For "continue writing", we only want to allow adding new blocks.
          functions: [addFunction],
        });
      },
      size: "small",
    },

    {
      key: "summarize",
      title: dict.ai_menu.summarize.title,
      aliases: dict.ai_menu.summarize.aliases,
      icon: <RiTextWrap size={18} />,
      onItemClick: async (_setPrompt, setAIResponseStatus) => {
        // setPrompt(dict.ai_menu.summarize.prompt_placeholder);
        contextValue.setPrevDocument(editor.document);
        setAIResponseStatus("generating");
        await callLLMStreaming(editor, {
          prompt: "Summarize",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [addFunction],
        });
        setAIResponseStatus("done");
      },
      size: "small",
    },
    {
      key: "action_items",
      title: dict.ai_menu.add_action_items.title,
      aliases: dict.ai_menu.add_action_items.aliases,
      icon: <RiListCheck3 size={18} />,
      onItemClick: () => {
        console.log("ADD ACTION ITEMS");
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

export function getDefaultAIEditMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);

  return [
    {
      key: "improve_writing",
      title: dict.ai_menu.improve_writing.title,
      aliases: dict.ai_menu.improve_writing.aliases,
      icon: <RiText size={18} />,
      onItemClick: () => {
        console.log("MAKE SHORTER");
      },
      size: "small",
    },
    {
      key: "fix_spelling",
      title: dict.ai_menu.fix_spelling.title,
      aliases: dict.ai_menu.fix_spelling.aliases,
      icon: <RiCheckLine size={18} />,
      onItemClick: () => {
        console.log("FIX SPELLING");
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
      onItemClick: () => {
        console.log("SIMPLIFY");
      },
      size: "small",
    },
  ];
}

export function getDefaultAIActionMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  contextValue: BlockNoteAIContextValue
): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);

  return [
    {
      key: "accept",
      title: dict.ai_menu.accept.title,
      aliases: dict.ai_menu.accept.aliases,
      icon: <RiCheckFill size={18} />,
      onItemClick: (_setPrompt) => {
        contextValue.setAiMenuBlockID(undefined);
        contextValue.setPrevDocument(undefined);
      },
      size: "small",
    },
    {
      key: "retry",
      title: dict.ai_menu.retry.title,
      aliases: dict.ai_menu.retry.aliases,
      icon: <RiLoopLeftFill size={18} />,
      onItemClick: () => {
        console.log("RETRY");
      },
      size: "small",
    },
    {
      key: "revert",
      title: dict.ai_menu.revert.title,
      aliases: dict.ai_menu.revert.aliases,
      icon: <RiArrowGoBackFill size={18} />,
      onItemClick: () => {
        editor.replaceBlocks(editor.document, contextValue.prevDocument as any);
        contextValue.setAiMenuBlockID(undefined);
        contextValue.setPrevDocument(undefined);
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
