import { defaultSelectionBuilder, yCursorPlugin } from "y-prosemirror";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";

export type CollaborationUser = {
  name: string;
  color: string;
  [key: string]: string;
};

/**
 * Determine whether the foreground color should be white or black based on a provided background color
 * Inspired by: https://stackoverflow.com/a/3943023
 */
function isDarkColor(bgColor: string): boolean {
  const color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16); // hexToR
  const g = parseInt(color.substring(2, 4), 16); // hexToG
  const b = parseInt(color.substring(4, 6), 16); // hexToB
  const uicolors = [r / 255, g / 255, b / 255];
  const c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L <= 0.179;
}

function defaultCursorRender(user: CollaborationUser) {
  const cursorElement = document.createElement("span");

  cursorElement.classList.add("bn-collaboration-cursor__base");

  const caretElement = document.createElement("span");
  caretElement.setAttribute("contentedEditable", "false");
  caretElement.classList.add("bn-collaboration-cursor__caret");
  caretElement.setAttribute(
    "style",
    `background-color: ${user.color}; color: ${
      isDarkColor(user.color) ? "white" : "black"
    }`,
  );

  const labelElement = document.createElement("span");

  labelElement.classList.add("bn-collaboration-cursor__label");
  labelElement.setAttribute(
    "style",
    `background-color: ${user.color}; color: ${
      isDarkColor(user.color) ? "white" : "black"
    }`,
  );
  labelElement.insertBefore(document.createTextNode(user.name), null);

  caretElement.insertBefore(labelElement, null);

  cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space
  cursorElement.insertBefore(caretElement, null);
  cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space

  return cursorElement;
}

export const YCursorExtension = createExtension(
  ({ options }: ExtensionOptions<CollaborationOptions>) => {
    const recentlyUpdatedCursors = new Map();
    const awareness =
      options.provider &&
      "awareness" in options.provider &&
      typeof options.provider.awareness === "object"
        ? options.provider.awareness
        : undefined;
    if (awareness) {
      if (
        "setLocalStateField" in awareness &&
        typeof awareness.setLocalStateField === "function"
      ) {
        awareness.setLocalStateField("user", options.user);
      }
      if ("on" in awareness && typeof awareness.on === "function") {
        if (options.showCursorLabels !== "always") {
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
                const cursor = recentlyUpdatedCursors.get(clientID);

                if (cursor) {
                  cursor.element.setAttribute("data-active", "");

                  if (cursor.hideTimeout) {
                    clearTimeout(cursor.hideTimeout);
                  }

                  recentlyUpdatedCursors.set(clientID, {
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
      }
    }

    return {
      key: "yCursor",
      prosemirrorPlugins: [
        awareness
          ? yCursorPlugin(awareness, {
              selectionBuilder: defaultSelectionBuilder,
              cursorBuilder(user: CollaborationUser, clientID: number) {
                let cursorData = recentlyUpdatedCursors.get(clientID);

                if (!cursorData) {
                  const cursorElement = (
                    options.renderCursor ?? defaultCursorRender
                  )(user);

                  if (options.showCursorLabels !== "always") {
                    cursorElement.addEventListener("mouseenter", () => {
                      const cursor = recentlyUpdatedCursors.get(clientID)!;
                      cursor.element.setAttribute("data-active", "");

                      if (cursor.hideTimeout) {
                        clearTimeout(cursor.hideTimeout);
                        recentlyUpdatedCursors.set(clientID, {
                          element: cursor.element,
                          hideTimeout: undefined,
                        });
                      }
                    });

                    cursorElement.addEventListener("mouseleave", () => {
                      const cursor = recentlyUpdatedCursors.get(clientID)!;

                      recentlyUpdatedCursors.set(clientID, {
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

                  recentlyUpdatedCursors.set(clientID, cursorData);
                }

                return cursorData.element;
              },
            })
          : undefined,
      ].filter(Boolean),
      dependsOn: ["ySync"],
      updateUser(user: { name: string; color: string; [key: string]: string }) {
        awareness?.setLocalStateField("user", user);
      },
    } as const;
  },
);
