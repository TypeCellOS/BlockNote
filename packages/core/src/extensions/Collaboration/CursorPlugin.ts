import { Plugin } from "prosemirror-state";
import { defaultSelectionBuilder, yCursorPlugin } from "y-prosemirror";
import { Awareness } from "y-protocols/awareness.js";
import * as Y from "yjs";

export type CollaborationUser = {
  name: string;
  color: string;
  [key: string]: string;
};

export class CursorPlugin {
  public plugin: Plugin;
  private provider: { awareness: Awareness };
  private recentlyUpdatedCursors: Map<
    number,
    { element: HTMLElement; hideTimeout: NodeJS.Timeout | undefined }
  >;
  constructor(
    private collaboration: {
      fragment: Y.XmlFragment;
      user: CollaborationUser;
      provider: { awareness: Awareness };
      renderCursor?: (user: CollaborationUser) => HTMLElement;
      showCursorLabels?: "always" | "activity";
    },
  ) {
    this.provider = collaboration.provider;
    this.recentlyUpdatedCursors = new Map();

    this.provider.awareness.setLocalStateField("user", collaboration.user);

    if (collaboration.showCursorLabels !== "always") {
      this.provider.awareness.on(
        "change",
        ({
          updated,
        }: {
          added: Array<number>;
          updated: Array<number>;
          removed: Array<number>;
        }) => {
          for (const clientID of updated) {
            const cursor = this.recentlyUpdatedCursors.get(clientID);

            if (cursor) {
              cursor.element.setAttribute("data-active", "");

              if (cursor.hideTimeout) {
                clearTimeout(cursor.hideTimeout);
              }

              this.recentlyUpdatedCursors.set(clientID, {
                element: cursor.element,
                hideTimeout: setTimeout(() => {
                  cursor.element.removeAttribute("data-active");
                }, 2000),
              });
            }
          }
        },
      );
    }

    this.plugin = yCursorPlugin(this.provider.awareness, {
      selectionBuilder: defaultSelectionBuilder,
      cursorBuilder: this.renderCursor,
    });
  }

  public get priority() {
    return 999;
  }

  private renderCursor = (user: CollaborationUser, clientID: number) => {
    let cursorData = this.recentlyUpdatedCursors.get(clientID);

    if (!cursorData) {
      const cursorElement = (
        this.collaboration.renderCursor ?? CursorPlugin.defaultCursorRender
      )(user);

      if (this.collaboration.showCursorLabels !== "always") {
        cursorElement.addEventListener("mouseenter", () => {
          const cursor = this.recentlyUpdatedCursors.get(clientID)!;
          cursor.element.setAttribute("data-active", "");

          if (cursor.hideTimeout) {
            clearTimeout(cursor.hideTimeout);
            this.recentlyUpdatedCursors.set(clientID, {
              element: cursor.element,
              hideTimeout: undefined,
            });
          }
        });

        cursorElement.addEventListener("mouseleave", () => {
          const cursor = this.recentlyUpdatedCursors.get(clientID)!;

          this.recentlyUpdatedCursors.set(clientID, {
            element: cursor.element,
            hideTimeout: setTimeout(() => {
              cursor.element.removeAttribute("data-active");
            }, 2000),
          });
        });
      }

      cursorData = {
        element: cursorElement,
        hideTimeout: undefined,
      };

      this.recentlyUpdatedCursors.set(clientID, cursorData);
    }

    return cursorData.element;
  };

  public updateUser = (user: {
    name: string;
    color: string;
    [key: string]: string;
  }) => {
    this.provider.awareness.setLocalStateField("user", user);
  };

  public static defaultCursorRender = (user: CollaborationUser) => {
    const cursorElement = document.createElement("span");

    cursorElement.classList.add("bn-collaboration-cursor__base");

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
}
