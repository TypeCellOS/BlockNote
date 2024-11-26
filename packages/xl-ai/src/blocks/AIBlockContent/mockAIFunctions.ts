import { Block, BlockIdentifier, BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { AIInlineToolbarProsemirrorPlugin } from "../../extensions/AIInlineToolbar/AIInlineToolbarPlugin.js";

const flattenBlocks = (
  blocks: Block<any, any, any>[]
): Block<any, any, any>[] => {
  // Un-nests blocks, as we're using Markdown to convert the blocks to a prompt
  // for the AI model anyway.
  let noNestedBlocks = false;
  while (!noNestedBlocks) {
    noNestedBlocks = true;

    for (let i = blocks.length - 1; i >= 0; i--) {
      const children = blocks[i].children;

      if (children.length !== 0) {
        noNestedBlocks = false;
        blocks[i].children = [];
        blocks.splice(i + 1, 0, ...children);
      }
    }
  }

  return blocks;
};

// Mock function to edit the blocks using AI. Has 3 operation modes:
// - replaceSelection: Replaces the selected text with AI generated text. To
// make things easier, this actually replaces the selected blocks, and the final
// prompt specifies to only modify the selected text.
// - replaceBlock: Replaces a block with AI generated content. The block has to
// be specified when calling the function.
// - insert: Inserts AI generated text at the text cursor position. Assumes that
// a selection isn't active. To make things easier, this actually replaces the
// block containing the text cursor, and the final prompt specifies to only
// append content to it.
export const mockAICall = async (_prompt: string) =>
  new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(
        'Over time, a variety of different cat breeds have emerged. One of these is the Maine Coon, which is one of the largest domesticated cat breeds. Known for their friendly and sociable nature, Maine Coons are often referred to as "gentle giants." They have a distinctive physical appearance, characterized by their tufted ears, bushy tails, and long, shaggy fur that is well-suited for cold climates. Maine Coons are also intelligent and playful, making them excellent companions for families.\n'
      );
    }, 1000);
  });

// Replaces the selected text with AI generated text. To make things easier,
// this actually replaces the selected blocks, and the final prompt specifies
// to only modify the selected text.
export const mockAIReplaceSelection = async (
  editor: BlockNoteEditor<any, any, any>,
  prompt: string
): Promise<Block<any, any, any>[]> => {
  const blocks = flattenBlocks(editor.document);

  // Gets selection and blocks size, so we know where to set the selection
  // after the content is replaced.
  const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
  const startPos = editor._tiptapEditor.state.selection.from;
  const endPos = editor._tiptapEditor.state.selection.to;

  const selectedBlocks = editor.getSelection()?.blocks || [
    editor.getTextCursorPosition().block,
  ];
  const firstSelectedBlockIndex = blocks.findIndex(
    (block) => block.id === selectedBlocks[0].id
  );
  const lastSelectedBlockIndex = blocks.findIndex(
    (block) => block.id === selectedBlocks[selectedBlocks.length - 1].id
  );

  // We split the blocks to provide the AI model with full context of what
  // exactly is selected.
  const before = blocks.slice(0, firstSelectedBlockIndex);
  const selected = blocks.slice(
    firstSelectedBlockIndex,
    lastSelectedBlockIndex + 1
  );
  const after = blocks.slice(lastSelectedBlockIndex + 1);
  const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
  const selectedMarkdown = await editor.blocksToMarkdownLossy(selected);
  const afterMarkdown = await editor.blocksToMarkdownLossy(after);

  // We also split the text in the selected section to provide more exact
  // context for the selection.
  const beforeText = editor._tiptapEditor.state.doc.textBetween(
    editor._tiptapEditor.state.selection.$from.start(),
    editor._tiptapEditor.state.selection.from
  );
  const selectedText = editor._tiptapEditor.state.doc.textBetween(
    editor._tiptapEditor.state.selection.from,
    editor._tiptapEditor.state.selection.to
  );
  const afterText = editor._tiptapEditor.state.doc.textBetween(
    editor._tiptapEditor.state.selection.to,
    editor._tiptapEditor.state.selection.$to.end()
  );

  const fullPrompt = `Below is the content of an editable Markdown blocks. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the blocks before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the blocks after the selected section.

Text before:
\`\`\`
${beforeText}
\`\`\`
The text between the start of the selected section and the start of the user selection.

Selected text:
\`\`\`
${selectedText}
\`\`\`
The user selected text within the selected section.

Text after:
\`\`\`
${afterText}
\`\`\`
The text between the end of the user selection and the end of the selected section.

Prompt:
\`\`\`
${prompt}
\`\`\`
The AI prompt provided by the user.

Provide a version of the selected section where the selected text inside is modified based on the prompt. Provide Markdown only, the response should not contain any additional text.
`;

  const aiResponse = await mockAICall(fullPrompt);
  const replacementBlocks = await editor.tryParseMarkdownToBlocks(aiResponse);
  editor.replaceBlocks(selectedBlocks, replacementBlocks);

  const newDocSize = editor._tiptapEditor.state.doc.nodeSize;
  editor._tiptapEditor.view.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      TextSelection.create(
        editor._tiptapEditor.state.doc,
        startPos,
        endPos + newDocSize - oldDocSize
      )
    )
  );

  editor.formattingToolbar.closeMenu();
  editor.focus();
  (editor.extensions["aiInlineToolbar"] as AIInlineToolbarProsemirrorPlugin) // TODO
    .open(prompt, "replaceSelection");

  return selectedBlocks;
};

export const mockAIReplaceBlockContent = async (
  editor: BlockNoteEditor<any, any, any>,
  prompt: string,
  blockIdentifier: BlockIdentifier
): Promise<Block<any, any, any>[]> => {
  const blocks = flattenBlocks(editor.document);

  const blockID =
    typeof blockIdentifier === "string" ? blockIdentifier : blockIdentifier.id;

  const selectedBlock = editor.getBlock(blockIdentifier)!;
  const selectedBlockIndex = blocks.findIndex((block) => block.id === blockID);

  // We split the blocks to provide the AI model with full context of what
  // exactly is selected.
  const before = blocks.slice(0, selectedBlockIndex);
  const selected = blocks[selectedBlockIndex];
  const after = blocks.slice(selectedBlockIndex + 1);
  const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
  const selectedMarkdown = await editor.blocksToMarkdownLossy([selected]);
  const afterMarkdown = await editor.blocksToMarkdownLossy(after);

  const fullPrompt = `Below is the content of an editable Markdown blocks. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the blocks before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the blocks after the selected section.

Prompt:
\`\`\`
${prompt}
\`\`\`
The AI prompt provided by the user.

Replace the selected section with content based on the prompt. Provide Markdown only, the response should not contain any additional text.
`;

  const aiResponse = await mockAICall(fullPrompt);
  const replacementBlocks = await editor.tryParseMarkdownToBlocks(aiResponse);
  editor.updateBlock(selectedBlock, {
    props: { prompt },
    content: replacementBlocks[0].content,
  });
  editor.setTextCursorPosition(selectedBlock, "end");
  editor.focus();

  return [selectedBlock];
};

export const mockAIInsertAfterSelection = async (
  editor: BlockNoteEditor<any, any, any>,
  prompt: string
): Promise<Block<any, any, any>[]> => {
  const blocks = flattenBlocks(editor.document);

  // Gets selection and blocks size, so we know where to set the selection
  // after the content is replaced.
  const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
  const endPos = editor._tiptapEditor.state.selection.to;

  const selection = editor.getSelection();
  const selectedBlock =
    selection?.blocks[selection?.blocks.length - 1] ||
    editor.getTextCursorPosition().block;
  const selectedBlockIndex = blocks.findIndex(
    (block) => block.id === selectedBlock.id
  );

  // We split the blocks to provide the AI model with full context of what
  // exactly is selected.
  const before = blocks.slice(0, selectedBlockIndex);
  const selected = blocks[selectedBlockIndex];
  const after = blocks.slice(selectedBlockIndex + 1);
  const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
  const selectedMarkdown = await editor.blocksToMarkdownLossy([selected]);
  const afterMarkdown = await editor.blocksToMarkdownLossy(after);

  // We also split the text in the selected section to provide more exact
  // context for the selection.
  const beforeText = editor._tiptapEditor.state.doc.textBetween(
    editor._tiptapEditor.state.selection.$from.start(),
    editor._tiptapEditor.state.selection.to
  );
  const afterText = editor._tiptapEditor.state.doc.textBetween(
    editor._tiptapEditor.state.selection.to,
    editor._tiptapEditor.state.selection.$to.end()
  );

  const fullPrompt = `Below is the content of an editable Markdown blocks. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the blocks before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the blocks after the selected section.

Text before:
\`\`\`
${beforeText}
\`\`\`
The text between the start of the selected section and the text cursor.

Text after:
\`\`\`
${afterText}
\`\`\`
The text between the text cursor and the end of the selected section.

Prompt:
\`\`\`
${prompt}
\`\`\`
The AI prompt provided by the user.

Provide a modified version of the selected section where content based on the prompt is inserted at the text cursor position. Provide Markdown only, the response should not contain any additional text.
`;

  const aiResponse = await mockAICall(fullPrompt);
  const replacementBlocks = await editor.tryParseMarkdownToBlocks(aiResponse);
  editor.replaceBlocks([selectedBlock], replacementBlocks);

  const newDocSize = editor._tiptapEditor.state.doc.nodeSize;
  editor._tiptapEditor.view.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      TextSelection.create(
        editor._tiptapEditor.state.doc,
        endPos,
        endPos + newDocSize - oldDocSize
      )
    )
  );

  editor.formattingToolbar.closeMenu();
  editor.focus();
  (editor.extensions["aiInlineToolbar"] as AIInlineToolbarProsemirrorPlugin) // TODO
    .open(prompt, "insertAfterSelection");

  return [selectedBlock];
};
