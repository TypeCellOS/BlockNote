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
          debugger;
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
    _tiptapOptions: {
      extensions: [liveblocks],
    },
    disableExtensions: ["history"],
  });

  // const [x, setX] = useState<any>();

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setX(Math.random());
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      {/* {editor.prosemirrorView && editor.domElement && ( */}
      <div>
        HELLO
        {/* <Test editor={editor._tiptapEditor} />
        <Threads editor={editor._tiptapEditor} /> */}
      </div>
      {/* )} */}
      <FormattingToolbarController
        formattingToolbar={() => <CustomFormattingToolbar editor={editor} />}
      />
    </BlockNoteView>
  );
}

function Test(props: { editor: Editor }) {
  debugger;
  return <div>TEST</div>;
}
