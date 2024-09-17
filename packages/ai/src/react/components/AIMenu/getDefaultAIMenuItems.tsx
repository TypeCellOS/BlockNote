import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { streamObject, streamText } from 'ai';
import {
  AIInlineToolbarProsemirrorPlugin,
  AIMenuProsemirrorPlugin,
  getAIDictionary,
} from "../../../core";

// TODO: Maybe we don't want to define the default AI prompts based on the
//  dictionary
// TODO: name
export function getDefaultAIMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  operation: "insertAfterSelection" | "replaceSelection"
): DefaultReactSuggestionItem[] {
  const items = ["make_longer", "make_shorter", "rewrite"] as const;

  const dict = getAIDictionary(editor);

  return items.map((item) => ({
    name: item,
    title: dict.ai_menu[item].title,
    onItemClick: async () => {
      streamObject({
        
      });
      streamText({ 
experimental_toolCallStreaming
      })
      (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).close();
      (
        editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
      ).open(dict.ai_menu[item].title, operation);
    },
  }));
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


const context = createAIExecutionContext(editor, prompt, () = {
  // add ai command
  // add context


  // apply streaming response
  context.execute();
});
aitoolbar.open(context);
