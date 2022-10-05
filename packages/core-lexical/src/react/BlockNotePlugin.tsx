import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useBlockNoteSetup } from "./useBlockNoteSetup";

export function BlockNotePlugin(_props: {}) {
  const [editor] = useLexicalComposerContext();

  useBlockNoteSetup(editor);

  return null;
}
