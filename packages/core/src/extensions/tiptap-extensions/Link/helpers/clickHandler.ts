import type { Editor } from "@tiptap/core";
import { getAttributes } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";

type ClickHandlerOptions = {
  type: MarkType;
  tiptapEditor: Editor;
  editor?: BlockNoteEditor<any, any, any>;
  onClick?: (
    event: MouseEvent,
    editor: BlockNoteEditor<any, any, any>,
  ) => boolean | void;
};

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      handleClick: (view, _pos, event) => {
        if (event.button !== 0) {
          return false;
        }

        if (!view.editable) {
          return false;
        }

        let link: HTMLAnchorElement | null = null;

        if (
          event.target instanceof HTMLAnchorElement &&
          // Differentiate between link inline content and read-only links.
          event.target.getAttribute("data-inline-content-type") === "link"
        ) {
          link = event.target;
        } else {
          const target = event.target as HTMLElement | null;
          if (!target) {
            return false;
          }

          const root = options.tiptapEditor.view.dom;

          // Intentionally limit the lookup to the editor root.
          // Using tag names like DIV as boundaries breaks with custom NodeViews,
          link = target.closest<HTMLAnchorElement>(
            'a[data-inline-content-type="link"]',
          );

          if (link && !root.contains(link)) {
            link = null;
          }
        }

        if (!link) {
          return false;
        }

        if (options.onClick) {
          if (!options.editor) {
            throw new Error("BlockNoteEditor not found in Link click handler");
          }
          const result = options.onClick(event, options.editor);
          return result ?? true;
        }

        const attrs = getAttributes(view.state, options.type.name);
        const href = link.href ?? attrs.href;
        const target = link.target ?? attrs.target;

        if (href) {
          window.open(href, target);
          return true;
        }

        return false;
      },
    },
  });
}
