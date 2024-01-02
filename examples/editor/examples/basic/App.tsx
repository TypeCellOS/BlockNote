import {
  BaseSlashMenuItem,
  SlashMenuQuery,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };
export class CustomQueryManager extends SlashMenuQuery<
  any,
  any,
  any,
  BaseSlashMenuItem<any, any, any>
> {
  async query(q: string, items: any[]) {
    return items.filter((item) => item.name.includes(q));
  }

  async execute({ item, editor }: { item: any; editor: any }) {
    return item.execute(editor);
  }
}
export function App() {
  console.log("App");
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    slashMenuQueryManager: new CustomQueryManager(),
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView className="root" editor={editor} />;
}

export default App;
