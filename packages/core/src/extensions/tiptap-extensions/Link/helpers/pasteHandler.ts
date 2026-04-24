import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { findLinks } from "./linkDetector.js";

type PasteHandlerOptions = {
  editor: Editor;
  defaultProtocol: string;
  type: MarkType;
  shouldAutoLink?: (url: string) => boolean;
  isValidLink: (href: string) => boolean;
};

export function pasteHandler(options: PasteHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey("handlePasteLink"),
    props: {
      handlePaste: (view, _event, slice) => {
        const { shouldAutoLink, isValidLink } = options;
        const { state } = view;
        const { selection } = state;
        const { empty } = selection;

        if (empty) {
          return false;
        }

        let textContent = "";

        slice.content.forEach((node) => {
          textContent += node.textContent;
        });

        const link = findLinks(textContent, {
          defaultProtocol: options.defaultProtocol,
        }).find((item) => item.isLink && item.value === textContent);

        if (
          !textContent ||
          !link ||
          !isValidLink(link.value) ||
          (shouldAutoLink !== undefined && !shouldAutoLink(link.value))
        ) {
          return false;
        }

        return options.editor.commands.setMark(options.type, {
          href: link.href,
        });
      },
    },
  });
}
