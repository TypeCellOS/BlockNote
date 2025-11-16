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
        console.log("init");
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
          // return DecorationSet.create(doc, []);
        }

        if (selection && false) {
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
        }
        // Note: still has a bug with multiple changes (layout of old characters shifts lines down)
        console.log("calcmarks");
        let index = 0;
        const oldChars = new Map<string, number>();
        const newChars = new Map<string, number>();
        const newCharCounts: Record<string, number> = {};
        const oldCharCounts: Record<string, number> = {};

        let hasMarks = false;

        state.doc.descendants((node, pos) => {
          if (node.type.isText) {
            let insertionMark = node.marks.some(
              (mark) => mark.type.name === "insertion",
            );
            const deletionMark = node.marks.some(
              (mark) => mark.type.name === "deletion",
            );
            hasMarks = hasMarks || insertionMark || deletionMark;

            if (!deletionMark && hasMarks) {
              insertionMark = true;
            }

            if (insertionMark || deletionMark) {
              for (let i = 0; i < node.nodeSize; i++) {
                const char = node.textBetween(i, i + 1);
                let charId = "";
                if (insertionMark) {
                  newCharCounts[char] = (newCharCounts[char] || 0) + 1;
                  charId = `${char}-${newCharCounts[char]}`;
                } else if (deletionMark) {
                  oldCharCounts[char] = (oldCharCounts[char] || 0) + 1;
                  charId = `${char}-${oldCharCounts[char]}`;
                }

                decs.push(
                  Decoration.inline(pos + i, pos + i + 1, {
                    class: `char char-${insertionMark ? "insertion" : "deletion"}`,
                    "data-index": (index++).toString(),
                    "data-char-id": charId,
                  }),
                );
              }
            }
          }
        });

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const toMove = [...document.querySelectorAll(".char-insertion")];
          // const oldChars = document.querySelectorAll("del > .char");
          console.log(toMove);
          if (toMove.length === 0) {
            return;
          }
          debugger;

          const oldPositions = new Map<string, DOMRect>();

          const toHide = [];
          const toMakeAbsolute = [];
          for (const [char, count] of Object.entries(oldCharCounts)) {
            for (let i = 1; i <= count; i++) {
              const fadeOut = i > (newCharCounts[char] || 0);

              const charElement = document.querySelector(
                `del > [data-char-id="${char}-${i}"]`,
              ) as HTMLElement;

              if (!fadeOut) {
                // save pos
                toHide.push(charElement);
                // oldPositions.set(`${char}-${i}`, {
                //   left: charElement.offsetLeft,
                //   top: charElement.offsetTop,
                // });
                oldPositions.set(
                  `${char}-${i}`,
                  charElement.getBoundingClientRect(),
                );
              } else {
                toMakeAbsolute.push(charElement);
                // animate out
                // oldPositions.set(`${char}-${i}`, {
                //   left: charElement.offsetLeft,
                //   top: charElement.offsetTop,
                // });
                oldPositions.set(
                  `${char}-${i}`,
                  charElement.getBoundingClientRect(),
                );
              }
            }
          }
          for (const char of toMakeAbsolute) {
            // char.style.transform = `translate(${char.offsetLeft}px, ${char.offsetTop}px)`;
            // char.style.position = "absolute";
            char.style.opacity = "0";
            char.animate(
              [
                {
                  opacity: 1,
                },
                {
                  opacity: 0,
                },
              ],
              {
                duration: 300,
                easing: "ease-in-out",
              },
            );
            char.parentElement!.style.position = "absolute";
          }

          for (const char of toHide) {
            char.style.opacity = "0";
            char.parentElement!.style.position = "absolute";
          }

          for (const char of toMove) {
            const charId = char.getAttribute("data-char-id");
            const oldChar = document.querySelector(
              `del > [data-char-id="${charId}"]`,
            ) as HTMLElement;
            char.style.display = "inline-block";
            if (oldChar) {
              const oldPos = oldPositions.get(`${charId}`)!;
              const newPos = char.getBoundingClientRect();

              char.animate(
                [
                  {
                    transform: `translate(${oldPos.left - newPos.left}px, ${oldPos.top - newPos.top}px)`,
                  },
                  {
                    transform: "none",
                  },
                ],
                {
                  duration: 300,
                  easing: "ease-in-out",
                },
              );

              // animate from position
            } else {
              // animate fade in
              char.animate(
                [
                  {
                    opacity: 0,
                  },
                  {
                    opacity: 1,
                  },
                ],
                {
                  duration: 300,
                  easing: "ease-in-out",
                },
              );
            }
          }
        }, 1000);

        return DecorationSet.create(doc, decs);
      },
    },
  });
}

let timeout: any;

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
