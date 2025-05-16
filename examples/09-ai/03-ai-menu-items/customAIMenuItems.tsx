import { BlockNoteEditor } from "@blocknote/core";
import { AIMenuSuggestionItem, getAIExtension } from "@blocknote/xl-ai";
import { RiApps2AddFill, RiEmotionHappyFill } from "react-icons/ri";

// Custom item to make the text more casual.
export const makeCasual = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
  key: "make_casual",
  title: "Make Casual",
  // Aliases used when filtering AI Menu items from
  // text in prompt input.
  aliases: ["casual", "informal", "make informal"],
  icon: <RiEmotionHappyFill size={18} />,
  onItemClick: async () => {
    await getAIExtension(editor).callLLM({
      userPrompt: "Make casual",
      // Set to true to tell the LLM to specifically
      // use the selected content as context. Defaults
      // to false.
      useSelection: true,
      // Sets what operations the LLM is allowed to do.
      // In this case, we only want to allow updating
      // the selected content, so only `update` is set
      // to true. Defaults to `true` for all
      // operations.
      defaultStreamTools: {
        add: false,
        delete: false,
        update: true,
      },
    });
  },
  size: "small",
});

// Custom item to find related topics.
export const findRelatedTopics = (
  editor: BlockNoteEditor,
): AIMenuSuggestionItem => ({
  key: "find_related_topics",
  title: "Find Related Topics",
  // Aliases used when filtering AI Menu items from
  // text in prompt input.
  aliases: ["related topics", "find topics"],
  icon: <RiApps2AddFill size={18} />,
  onItemClick: async () => {
    await getAIExtension(editor).callLLM({
      userPrompt:
        "Find several related topics to the current text and write a sentence about each",
      // Sets what operations the LLM is allowed to do.
      // In this case, we only want to allow adding new
      // content, so only `add` is set to true.
      // Defaults to `true` for all operations.
      defaultStreamTools: {
        add: true,
        delete: false,
        update: false,
      },
    });
  },
  size: "small",
});
