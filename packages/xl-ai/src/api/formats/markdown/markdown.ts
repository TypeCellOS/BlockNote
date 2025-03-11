import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage, LanguageModel, generateText } from "ai";
import { markdownNodeDiff } from "../../../markdown/markdownNodeDiff.js";
import { markdownNodeDiffToBlockOperations } from "../../../markdown/markdownOperations.js";
import type { PromptOrMessages } from "../../index.js";
import {
  promptManipulateDocumentUseMarkdown,
  promptManipulateDocumentUseMarkdownWithSelection,
} from "../../prompts/markdownPrompts.js";
import { trimArray } from "../../util/trimArray.js";

type BasicLLMRequestOptions = {
  model: LanguageModel;
} & PromptOrMessages;

type MarkdownLLMRequestOptions = BasicLLMRequestOptions & {
  _generateTextOptions?: Partial<Parameters<typeof generateText<any>>[0]>;
};

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  options: MarkdownLLMRequestOptions
) {
  let messages: CoreMessage[];
  // TODO: add test with empty paragraphs at end, this should break without trim()
  const markdown = (await editor.blocksToMarkdownLossy()).trim();

  if ("messages" in options && options.messages) {
    messages = options.messages;
  } else if (options.useSelection) {
    const selection = editor.getDocumentWithSelectionMarkers();
    const markdown = (await editor.blocksToMarkdownLossy(selection)).trim();
    messages = promptManipulateDocumentUseMarkdownWithSelection({
      editor,
      markdown,
      userPrompt: (options as any).prompt,
    });
  } else {
    messages = promptManipulateDocumentUseMarkdown({
      editor,
      markdown,
      userPrompt: (options as any).prompt,
    });
  }

  const withDefaults: Required<
    Omit<MarkdownLLMRequestOptions & { messages: CoreMessage[] }, "prompt">
  > = {
    messages,
    ...(options as any), // TODO
  };

  const ret = await generateText<any>({
    model: withDefaults.model,
    messages: withDefaults.messages,
    ...options._generateTextOptions,
  });

  const blocks = trimArray(editor.document, (block) => {
    return (
      block.type === "paragraph" &&
      Array.isArray(block.content) &&
      block.content.length === 0
    );
  });
  const newMarkdown = ret.text.trim();
  // Test\n\nHello
  const diff = await markdownNodeDiff(markdown, newMarkdown);
  const operations = await markdownNodeDiffToBlockOperations(
    editor,
    blocks,
    diff
  );

  for (const operation of operations) {
    // await executeAIOperation(
    //   operation,
    //   editor,
    //   [updateFunction, addFunction, deleteFunction],
    //   undefined,
    //   { idsSuffixed: false }
    // );
  }
}
