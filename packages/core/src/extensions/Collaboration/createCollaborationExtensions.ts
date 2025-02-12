import Collaboration from "@tiptap/extension-collaboration";
import { Awareness } from "y-protocols/awareness";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";

export const createCollaborationExtensions = (collaboration: {
  fragment: Y.XmlFragment;
  user: {
    name: string;
    color: string;
    [key: string]: string;
  };
  provider: any;
  renderCursor?: (user: any) => HTMLElement;
  showCursorLabels?: "always" | "activity";
}) => {
  const tiptapExtensions = [];

  tiptapExtensions.push(
    Collaboration.configure({
      fragment: collaboration.fragment,
    })
  );

  const awareness = collaboration.provider?.awareness as Awareness | undefined;

  if (awareness) {
    const cursors = new Map<
      number,
      { element: HTMLElement; hideTimeout: NodeJS.Timeout | undefined }
    >();

    if (collaboration.showCursorLabels !== "always") {
      awareness.on(
        "change",
        ({
          updated,
        }: {
          added: Array<number>;
          updated: Array<number>;
          removed: Array<number>;
        }) => {
          for (const clientID of updated) {
            const cursor = cursors.get(clientID);

            if (cursor) {
              cursor.element.setAttribute("data-active", "");

              if (cursor.hideTimeout) {
                clearTimeout(cursor.hideTimeout);
              }

              cursors.set(clientID, {
                element: cursor.element,
                hideTimeout: setTimeout(() => {
                  cursor.element.removeAttribute("data-active");
                }, 2000),
              });
            }
          }
        }
      );
    }

    const renderCursor = (user: { name: string; color: string }) => {
      const cursorElement = document.createElement("span");

      cursorElement.classList.add("collaboration-cursor__base");

      const caretElement = document.createElement("span");
      caretElement.setAttribute("contentedEditable", "false");
      caretElement.classList.add("collaboration-cursor__caret");
      caretElement.setAttribute("style", `background-color: ${user.color}`);

      const labelElement = document.createElement("span");

      labelElement.classList.add("collaboration-cursor__label");
      labelElement.setAttribute("style", `background-color: ${user.color}`);
      labelElement.insertBefore(document.createTextNode(user.name), null);

      caretElement.insertBefore(labelElement, null);

      cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space
      cursorElement.insertBefore(caretElement, null);
      cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space

      return cursorElement;
    };

    const render = (user: { color: string; name: string }) => {
      const clientState = [...awareness.getStates().entries()].find(
        (state) => state[1].user === user
      );

      if (!clientState) {
        throw new Error("Could not find client state for user");
      }

      const clientID = clientState[0];

      let cursorData = cursors.get(clientID);

      if (!cursorData) {
        const cursorElement =
          collaboration?.renderCursor?.(user) || renderCursor(user);

        if (collaboration?.showCursorLabels !== "always") {
          cursorElement.addEventListener("mouseenter", () => {
            const cursor = cursors.get(clientID)!;
            cursor.element.setAttribute("data-active", "");

            if (cursor.hideTimeout) {
              clearTimeout(cursor.hideTimeout);
              cursors.set(clientID, {
                element: cursor.element,
                hideTimeout: undefined,
              });
            }
          });

          cursorElement.addEventListener("mouseleave", () => {
            const cursor = cursors.get(clientID)!;

            cursors.set(clientID, {
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

        cursors.set(clientID, cursorData);
      }

      return cursorData.element;
    };

    tiptapExtensions.push(
      CollaborationCursor.configure({
        user: collaboration.user,
        render,
        provider: collaboration.provider,
      })
    );
  }

  return tiptapExtensions;
};
