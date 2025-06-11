import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { defaultSelectionBuilder } from "y-prosemirror";

type AgentCursorState = {
  selection: { anchor: number; head: number } | undefined;
};
const PLUGIN_KEY = new PluginKey<AgentCursorState>(`blocknote-agent-cursor`);

/**
 * Plugin that renders an "AI" cursor
 */
export function createAgentCursorPlugin(agentCursor: {
  name: string;
  color: string;
}) {
  return new Plugin<AgentCursorState>({
    key: PLUGIN_KEY,
    view: (_view) => {
      return {};
    },
    state: {
      init: () => {
        return {
          selection: undefined,
        };
      },
      apply: (tr, _oldState) => {
        const meta = tr.getMeta("aiAgent");

        if (!meta) {
          return {
            selection: undefined,
          };
        }

        return {
          selection: meta.selection,
        };
      },
    },
    props: {
      decorations: (state) => {
        const { doc } = state;

        const { selection } = PLUGIN_KEY.getState(state)!;

        const decs = [];

        if (!selection) {
          return DecorationSet.create(doc, []);
        }

        decs.push(
          Decoration.widget(selection.head, () => renderCursor(agentCursor), {
            key: "agent-cursor",
            side: 10,
          }),
        );

        const from = Math.min(selection.anchor, selection.head);
        const to = Math.max(selection.anchor, selection.head);

        decs.push(
          Decoration.inline(from, to, defaultSelectionBuilder(agentCursor), {
            inclusiveEnd: true,
            inclusiveStart: false,
          }),
        );

        return DecorationSet.create(doc, decs);
      },
    },
  });
}

const renderCursor = (user: { name: string; color: string }) => {
  const cursorElement = document.createElement("span");

  cursorElement.classList.add("bn-collaboration-cursor__base");
  cursorElement.setAttribute("data-active", "true");

  const caretElement = document.createElement("span");
  caretElement.setAttribute("contentedEditable", "false");
  caretElement.classList.add("bn-collaboration-cursor__caret");
  caretElement.setAttribute("style", `background-color: ${user.color}`);

  const labelElement = document.createElement("span");

  labelElement.classList.add("bn-collaboration-cursor__label");
  labelElement.setAttribute("style", `background-color: ${user.color}`);
  labelElement.insertBefore(document.createTextNode(user.name), null);

  caretElement.insertBefore(labelElement, null);

  cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space
  cursorElement.insertBefore(caretElement, null);
  cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space

  return cursorElement;
};
