import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import {
  RiBallPenLine,
  RiCheckLine,
  RiEarthLine,
  RiListCheck3,
  RiMagicLine,
  RiText,
  RiTextWrap,
} from "react-icons/ri";
import { getAIDictionary } from "../../i18n/dictionary";

export type AIMenuSuggestionItem = Omit<
  DefaultReactSuggestionItem,
  "onItemClick"
> & {
  onItemClick: (setPrompt: (prompt: string) => void) => void;
};
// TODO: name
export function getDefaultAIMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): AIMenuSuggestionItem[] {
  const dict = getAIDictionary(editor);
  const selection = editor.getSelection();

  if (!selection) {
    // the AI menu has been opened via the / command
    return [
      {
        name: "continue_writing",
        title: dict.ai_menu.continue_writing.title,
        aliases: dict.ai_menu.continue_writing.aliases,
        icon: <RiBallPenLine size={18} />,
        onItemClick: () => {
          console.log("MAKE SHORTER");
        },
      },

      {
        name: "summarize",
        title: dict.ai_menu.summarize.title,
        aliases: dict.ai_menu.summarize.aliases,
        icon: <RiTextWrap size={18} />,
        onItemClick: () => {
          console.log("SUMMARIZE");
        },
      },
      {
        name: "action_items",
        title: dict.ai_menu.add_action_items.title,
        aliases: dict.ai_menu.add_action_items.aliases,
        icon: <RiListCheck3 size={18} />,
        onItemClick: () => {
          console.log("ADD ACTION ITEMS");
        },
      },
      {
        name: "write_anything",
        title: dict.ai_menu.write_anything.title,
        aliases: dict.ai_menu.write_anything.aliases,
        icon: <RiBallPenLine size={18} />,
        onItemClick: (setPrompt) => {
          setPrompt(dict.ai_menu.write_anything.prompt_placeholder);
        },
      },
    ];
  } else {
    // the AI menu has been opened via the formatting toolbar (the user highlighted text and clicked the AI button)
    return [
      {
        name: "improve_writing",
        title: dict.ai_menu.improve_writing.title,
        aliases: dict.ai_menu.improve_writing.aliases,
        icon: <RiText size={18} />,
        onItemClick: () => {
          console.log("MAKE SHORTER");
        },
      },
      {
        name: "fix_spelling",
        title: dict.ai_menu.fix_spelling.title,
        aliases: dict.ai_menu.fix_spelling.aliases,
        icon: <RiCheckLine size={18} />,
        onItemClick: () => {
          console.log("FIX SPELLING");
        },
      },
      {
        name: "translate",
        title: dict.ai_menu.translate.title,
        aliases: dict.ai_menu.translate.aliases,
        icon: <RiEarthLine size={18} />,
        onItemClick: (setPrompt) => {
          setPrompt(dict.ai_menu.translate.prompt_placeholder);
        },
      },
      {
        name: "simplify",
        title: dict.ai_menu.simplify.title,
        aliases: dict.ai_menu.simplify.aliases,
        icon: <RiMagicLine size={18} />,
        onItemClick: () => {
          console.log("SIMPLIFY");
        },
      },
    ];
  }
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
