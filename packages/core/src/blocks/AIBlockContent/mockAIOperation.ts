import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockIdentifier } from "../../schema";

// Mock function to edit the document using AI. Has 3 operation modes:
// - replaceSelection: Replaces the selected text with AI generated text. To
// make things easier, this actually replaces the selected blocks, and the final
// prompt specifies to only modify the selected text.
// - replaceBlock: Replaces a block with AI generated content. The block has to
// be specified when calling the function.
// - insert: Inserts AI generated text at the text cursor position. Assumes that
// a selection isn't active. To make things easier, this actually replaces the
// block containing the text cursor, and the final prompt specifies to only
// append content to it.
export const mockAIOperation = async (
  editor: BlockNoteEditor<any, any, any>,
  prompt: string,
  options:
    | { operation: "replaceSelection" }
    | { operation: "replaceBlock"; blockIdentifier: BlockIdentifier }
    | { operation: "insert" } = { operation: "insert" }
) => {
  const document = editor.document;

  // Un-nests blocks, as we're using Markdown to convert the blocks to a prompt
  // for the AI model anyway.
  let noNestedBlocks = false;
  while (!noNestedBlocks) {
    noNestedBlocks = true;

    for (let i = document.length - 1; i >= 0; i--) {
      const children = document[i].children;

      if (children.length !== 0) {
        noNestedBlocks = false;
        document[i].children = [];
        document.splice(i + 1, 0, ...children);
      }
    }
  }

  let fullPrompt: string;

  if (options.operation === "replaceSelection") {
    const selectedBlocks = editor.getSelection()?.blocks || [
      editor.getTextCursorPosition().block,
    ];

    const firstSelectedBlockIndex = document.findIndex(
      (block) => block.id === selectedBlocks[0].id
    );
    const lastSelectedBlockIndex = document.findIndex(
      (block) => block.id === selectedBlocks[selectedBlocks.length - 1].id
    );

    // We split the document to provide the AI model with full context of what
    // exactly is selected.
    const before = document.slice(0, firstSelectedBlockIndex);
    const selected = document.slice(
      firstSelectedBlockIndex,
      lastSelectedBlockIndex + 1
    );
    const after = document.slice(lastSelectedBlockIndex + 1);

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

    const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
    const selectedMarkdown = await editor.blocksToMarkdownLossy(selected);
    const afterMarkdown = await editor.blocksToMarkdownLossy(after);

    fullPrompt = `Below is the content of an editable Markdown document. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the document before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the document after the selected section.

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
  } else if (options.operation === "replaceBlock") {
    const blockID =
      typeof options.blockIdentifier === "string"
        ? options.blockIdentifier
        : options.blockIdentifier.id;

    const selectedBlockIndex = document.findIndex(
      (block) => block.id === blockID
    );

    // We split the document to provide the AI model with full context of what
    // exactly is selected.
    const before = document.slice(0, selectedBlockIndex);
    const selected = document[selectedBlockIndex];
    const after = document.slice(selectedBlockIndex + 1);

    const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
    const selectedMarkdown = await editor.blocksToMarkdownLossy([selected]);
    const afterMarkdown = await editor.blocksToMarkdownLossy(after);

    fullPrompt = `Below is the content of an editable Markdown document. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the document before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the document after the selected section.

Prompt:
\`\`\`
${prompt}
\`\`\`
The AI prompt provided by the user.

Provide a version of the selected section which is modified based on the prompt. Provide Markdown only, the response should not contain any additional text.
`;
  } else {
    const selectedBlock = editor.getTextCursorPosition().block;

    const selectedBlockIndex = document.findIndex(
      (block) => block.id === selectedBlock.id
    );

    // We split the document to provide the AI model with full context of what
    // exactly is selected.
    const before = document.slice(0, selectedBlockIndex);
    const selected = document[selectedBlockIndex];
    const after = document.slice(selectedBlockIndex + 1);

    const beforeText = editor._tiptapEditor.state.doc.textBetween(
      editor._tiptapEditor.state.selection.$from.start(),
      editor._tiptapEditor.state.selection.from
    );
    const afterText = editor._tiptapEditor.state.doc.textBetween(
      editor._tiptapEditor.state.selection.to,
      editor._tiptapEditor.state.selection.$to.end()
    );

    const beforeMarkdown = await editor.blocksToMarkdownLossy(before);
    const selectedMarkdown = await editor.blocksToMarkdownLossy([selected]);
    const afterMarkdown = await editor.blocksToMarkdownLossy(after);

    fullPrompt = `Below is the content of an editable Markdown document. It's split into sections to show where the user selection is located.
    
Content before:
\`\`\`
${beforeMarkdown}
\`\`\`
The Markdown content in the document before the selected section.

Selected section:
\`\`\`
${selectedMarkdown}
\`\`\`
The Markdown content of the selected section.

Content after:
\`\`\`
${afterMarkdown}
\`\`\`
The Markdown content in the document after the selected section.

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
  }

  console.log(fullPrompt);

  const mockFetchAIResponse = async (_prompt: string) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        //         resolve(
        //           `The text before this block discusses cats, focusing on their domestication and origins in the Near East around 7500 BC. It highlights their classification as a domesticated species within the family Felidae.
        //
        // The text after this block describes dogs, noting their descent from wolves and their domestication over 14,000 years ago. It emphasizes that dogs were the first species domesticated by humans.`
        //         );
        resolve(
          'Over time, a variety of different cat breeds have emerged. One of these is the Maine Coon, which is one of the largest domesticated cat breeds. Known for their friendly and sociable nature, Maine Coons are often referred to as "gentle giants." They have a distinctive physical appearance, characterized by their tufted ears, bushy tails, and long, shaggy fur that is well-suited for cold climates. Maine Coons are also intelligent and playful, making them excellent companions for families.\n'
        );
      }, 1000);
    });
  };

  const aiResponse = await mockFetchAIResponse(fullPrompt);

  return await editor.tryParseMarkdownToBlocks(aiResponse);
};
