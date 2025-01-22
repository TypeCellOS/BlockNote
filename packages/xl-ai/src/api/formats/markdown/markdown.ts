import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage, LanguageModel, generateText } from "ai";
import { markdownNodeDiff } from "../../../markdown/markdownNodeDiff.js";
import { markdownNodeDiffToBlockOperations } from "../../../markdown/markdownOperations.js";
import { executeAIOperation } from "../../executor/executor.js";
import { addFunction } from "../../functions/add.js";
import { deleteFunction } from "../../functions/delete.js";
import { updateFunction } from "../../functions/update.js";
import { promptManipulateDocumentUseMarkdown } from "../../prompts/markdownPrompts.js";
import { trimArray } from "../../util/trimArray.js";

type PromptOrMessages =
  | {
      prompt: string;
    }
  | {
      messages: Array<CoreMessage>;
    };

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
  const markdown = await editor.blocksToMarkdownLossy();

  const withDefaults: Required<
    Omit<MarkdownLLMRequestOptions & { messages: CoreMessage[] }, "prompt">
  > = {
    messages:
      "messages" in options
        ? options.messages
        : promptManipulateDocumentUseMarkdown({
            editor,
            markdown,
            userPrompt: (options as any).prompt,
          }),
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

  const diff = await markdownNodeDiff(markdown, newMarkdown);
  const operations = await markdownNodeDiffToBlockOperations(
    editor,
    blocks,
    diff
  );

  for (const operation of operations) {
    await executeAIOperation(
      operation,
      editor,
      [updateFunction, addFunction, deleteFunction],
      undefined,
      { idsSuffixed: false }
    );
  }
}
