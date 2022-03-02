import { useState } from 'react'

// import logo from './logo.svg'
// import './App.css'
import { useEditor, EditorContent } from "@blocknote/core";

// import "@blocknote/core/style.css";

function App() {


  const editor = useEditor({
    onUpdate: ({ editor }) => {
      console.log(editor.getJSON());
    },
    // editorProps: {
    //   attributes: {
    //     class: "editor",
    //   },
    // },
  });

  return (
    <div>
      {/* {editor != null ? (
        <InlineMenu editor={editor} commentStore={commentStore} />
      ) : null}
      {editor != null ? <TableMenu editor={editor} /> : null}
      {editor != null ? (
        <CommentWrapper editor={editor} commentStore={commentStore} />
      ) : null} */}
      {/* <EngineContext.Provider */}
      {/* value={{ compiler, executionHost, document: props.document }}> */}
      <EditorContent editor={editor} />
      {/* </EngineContext.Provider> */}
    </div>
  );
}

export default App
