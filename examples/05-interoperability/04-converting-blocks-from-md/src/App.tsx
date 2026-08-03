import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

import { schema } from "./schema";
import { FormulaEditorProvider } from "./formula/formulaContext";
import {
  FormulaEditorModal,
  type FormulaEditorHandlers,
} from "./formula/FormulaEditorModal";
import { CustomFormattingToolbar } from "./toolbar/CustomFormattingToolbar";
import { preprocessMarkdown } from "./markdown/preprocessMarkdown";
import { postprocessBlocks } from "./markdown/postprocessBlocks";
import { initialMarkdown } from "./markdown/initialMarkdown";
import "./styles.css";

function EditorShell() {
  const editor = useCreateBlockNote({ schema });

  useEffect(() => {
    const { processed, inlineMap, blockMap } =
      preprocessMarkdown(initialMarkdown);
    const raw = editor.tryParseMarkdownToBlocks(processed);
    const withFormulas = postprocessBlocks(raw as any, inlineMap, blockMap);
    editor.replaceBlocks(editor.document, withFormulas as any);
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handlers: FormulaEditorHandlers = {
    onInsert(kind, latex) {
      if (kind === "inline") {
        editor.insertInlineContent([
          {
            type: "formulaInline",
            props: { latex },
            content: undefined,
          } as any,
        ]);
      } else {
        editor.insertBlocks(
          [{ type: "formulaBlock", props: { latex } } as any],
          editor.getTextCursorPosition().block,
          "after",
        );
      }
    },
    onUpdate(target, latex) {
      if (target.kind === "block") {
        editor.updateBlock(target.blockId, {
          type: "formulaBlock",
          props: { latex },
        } as any);
      } else {
        // Replace the inline node at the current selection. The simplest reliable
        // path: replace the whole inline content of the containing block by
        // rewriting the inline content list.
        const block = editor.getTextCursorPosition().block;
        if (!Array.isArray(block.content)) return;
        const nextContent = block.content.map((node: any) => {
          if (
            node.type === "formulaInline" &&
            node.props?.latex === target.latex
          ) {
            return { ...node, props: { latex } };
          }
          return node;
        });
        editor.updateBlock(block, { content: nextContent } as any);
      }
    },
  };

  return (
    <>
      <BlockNoteView editor={editor} editable={true} formattingToolbar={false}>
        <CustomFormattingToolbar />
      </BlockNoteView>
      <FormulaEditorModal handlers={handlers} />
    </>
  );
}

export default function App() {
  return (
    <FormulaEditorProvider>
      <EditorShell />
    </FormulaEditorProvider>
  );
}
