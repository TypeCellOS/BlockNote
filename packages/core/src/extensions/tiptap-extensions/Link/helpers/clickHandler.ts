import type { Editor } from "@tiptap/core";
import { getAttributes } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

type ClickHandlerOptions = {
  type: MarkType;
  editor: Editor;
  onClick?: (event: MouseEvent) => boolean | void;
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

        if (event.target instanceof HTMLAnchorElement) {
          link = event.target;
        } else {
          const target = event.target as HTMLElement | null;
          if (!target) {
            return false;
          }

          const root = options.editor.view.dom;

          // Intentionally limit the lookup to the editor root.
          // Using tag names like DIV as boundaries breaks with custom NodeViews,
          link = target.closest<HTMLAnchorElement>("a");

          if (link && !root.contains(link)) {
            link = null;
          }
        }

        if (!link) {
          return false;
        }

        if (options.onClick) {
          const result = options.onClick(event);
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
