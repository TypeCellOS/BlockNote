"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbar,
  FormattingToolbarController,
  blockTypeSelectItems,
  getFormattingToolbarItems,
  useComponentsContext,
  useCreateBlockNote,
} from "@blocknote/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { Threads } from "./Threads";

export function CustomFormattingToolbar(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  const ctx = useComponentsContext()!;
  return (
    <FormattingToolbar>
      {...getFormattingToolbarItems(
        blockTypeSelectItems(props.editor.dictionary)
      )}
      <ctx.FormattingToolbar.Button
        mainTooltip="Add comment"
        onClick={() => {
          props.editor?._tiptapEditor.chain().focus().addPendingComment().run();
        }}>
        Comment
      </ctx.FormattingToolbar.Button>
    </FormattingToolbar>
  );
}

export function Editor() {
  const liveblocks = useLiveblocksExtension();

  const editor = useCreateBlockNote({
    _extensions: { liveblocksExtension: liveblocks },
    disableExtensions: ["history"],
  });

  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <Threads editor={editor._tiptapEditor} />
      <FormattingToolbarController
        formattingToolbar={() => <CustomFormattingToolbar editor={editor} />}
      />
    </BlockNoteView>
  );
}
