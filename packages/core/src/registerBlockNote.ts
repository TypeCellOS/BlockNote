import { mergeRegister } from "@lexical/utils";
import type { LexicalEditor } from "lexical";

import { registerDragonSupport } from "@lexical/dragon";
import { registerRichText } from "@lexical/rich-text";
import { registerIndentationCommands } from "./commands/indentation";
import { patchNode } from "./nodes/patchNodes";

export function registerBlockNote(editor: LexicalEditor) {
  editor._nodes.forEach((node) => {
    const type = node.klass.getType();
    if (
      type !== "root" &&
      type !== "linebreak" &&
      type !== "childgroup" &&
      type !== "text" &&
      type !== "listitem"
    ) {
      console.log("patchnode", type);
      patchNode(node.klass);
    }
  });

  return mergeRegister(
    registerRichText(editor),
    registerDragonSupport(editor),
    registerIndentationCommands(editor)
    // registerAnimation(editor),
    // registerMarkdownShortcuts(editor, TRANSFORMERS)
  );
}
