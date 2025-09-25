import { BlockNoteEditor } from "@blocknote/core";
import {
  aiDocumentFormats,
  AIMenuSuggestionItem,
  getAIExtension,
} from "@blocknote/xl-ai";
import { RiApps2AddFill, RiEmotionHappyFill } from "react-icons/ri";

// Custom item to make the text more informal.
export const makeInformal = (
  editor: BlockNoteEditor,
): AIMenuSuggestionItem => ({
  key: "make_informal",
  title: "Make Informal",
  // Aliases used when filtering AI Menu items from
  // text in prompt input.
  aliases: ["informal", "make informal", "casual"],
  icon: <RiEmotionHappyFill size={18} />,
  onItemClick: async () => {
    await getAIExtension(editor).invokeAI({
      userPrompt: "Give the selected text a more informal (casual) tone",
      // Set to true to tell the LLM to specifically
      // use the selected content as context. Defaults
      // to false.
      useSelection: true,
      // Sets what operations the LLM is allowed to do.
      // In this case, we only want to allow updating
      // the selected content, so only `update` is set
      // to true. Defaults to `true` for all
      // operations.
      streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
        defaultStreamTools: {
          add: false,
          delete: false,
          update: true,
        },
      }),
    });
  },
  size: "small",
});

// Custom item to write about related topics.
export const addRelatedTopics = (
  editor: BlockNoteEditor,
): AIMenuSuggestionItem => ({
  key: "add_related_topics",
  title: "Add Related Topics",
  // Aliases used when filtering AI Menu items from
  // text in prompt input.
  aliases: ["related topics", "find topics"],
  icon: <RiApps2AddFill size={18} />,
  onItemClick: async () => {
    await getAIExtension(editor).invokeAI({
      userPrompt:
        "Think of some related topics to the current text and write a sentence about each",
      // Sets what operations the LLM is allowed to do.
      // In this case, we only want to allow adding new
      // content, so only `add` is set to true.
      // Defaults to `true` for all operations.
      streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
        defaultStreamTools: {
          add: true,
          delete: false,
          update: false,
        },
      }),
    });
  },
  size: "small",
});
