import { mergeRegister } from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import { useLayoutEffect } from "react";
import { registerBlockNote } from "../registerBlockNote";

export function useBlockNoteSetup(editor: LexicalEditor): void {
  useLayoutEffect(() => {
    return mergeRegister(registerBlockNote(editor));

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
}
