import { uuidv4 } from "lib0/random";

export type CollaborationUser = {
  id?: string;
  name: string;
  color: string;
  [key: string]: unknown;
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

type CursorLabel = {
  element: HTMLElement;
  collisionRect: HTMLElement;
  anchorName: string;
};

function defaultCursorRender(
  user: CollaborationUser,
  existingLabel?: CursorLabel,
) {
  const cursorElement = document.createElement("span");

  cursorElement.classList.add("bn-collaboration-cursor__base");

  const caretElement = document.createElement("span");
  caretElement.contentEditable = "false";
  caretElement.classList.add("bn-collaboration-cursor__caret");

  const labelElement = existingLabel?.element ?? document.createElement("span");
  labelElement.classList.add("bn-collaboration-cursor__label");
  labelElement.textContent = user.name;

  // Reserves the open label's size to flip the orientation at the viewport edges before opening.
  const collisionRect =
    existingLabel?.collisionRect ?? document.createElement("span");
  collisionRect.classList.add("bn-collaboration-cursor__label-collision-rect");
  if (collisionRect.firstChild) {
    collisionRect.firstChild.nodeValue = user.name;
  } else {
    collisionRect.append(user.name, labelElement);
  }

  // Names must be unique across editors sharing the same document/portal root.
  const anchorName = existingLabel?.anchorName ?? `--bn-cursor-${uuidv4()}`;
  caretElement.style.setProperty("anchor-name", anchorName);
  labelElement.style.setProperty("position-anchor", anchorName);
  collisionRect.style.setProperty("position-anchor", anchorName);
  collisionRect.style.setProperty("anchor-name", `${anchorName}-label`);
  labelElement.style.setProperty(
    "--bn-cursor-label-anchor",
    `${anchorName}-label`,
  );

  const textColor = isDarkColor(user.color) ? "white" : "black";
  caretElement.style.backgroundColor = user.color;
  labelElement.style.backgroundColor = user.color;

  labelElement.style.setProperty("--bn-cursor-label-color", textColor);
  // Word joiners anchor the widget in the text without adding visible spacing.
  cursorElement.append("\u2060", caretElement, "\u2060");

  return {
    element: cursorElement,
    label: {
      element: labelElement,
      collisionRect,
      anchorName,
    },
  };
}

type Cursor = {
  element: HTMLElement;
  label?: CursorLabel;
  hideTimeout?: ReturnType<typeof setTimeout>;
};

/** Shared DOM renderer for the Yjs 13 and Yjs 14 cursor plugins. */
export function createCollaborationCursorManager(options: {
  renderCursor?: (user: CollaborationUser) => HTMLElement;
  showCursorLabels?: "always" | "activity";
  getPortalElement: () => HTMLElement;
  hasCursor: (clientID: number) => boolean;
}) {
  const cursors = new Map<number, Cursor>();
  function hideCursor(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.element.removeAttribute("data-active");
    cursor.label?.element.removeAttribute("data-active");
  }

  function showCursor(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.element.setAttribute("data-active", "");
    cursor.label?.element.setAttribute("data-active", "");
  }

  function scheduleHide(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.hideTimeout = setTimeout(() => hideCursor(cursor), 2000);
  }

  function removeCursor(clientID: number) {
    const cursor = cursors.get(clientID);
    if (cursor) {
      hideCursor(cursor);
      cursor.label?.collisionRect.remove();
      cursors.delete(clientID);
    }
  }

  function cursorBuilder(user: CollaborationUser, clientID: number) {
    const existing = cursors.get(clientID);
    clearTimeout(existing?.hideTimeout);

    const cursor: Cursor = options.renderCursor
      ? { element: options.renderCursor(user) }
      : defaultCursorRender(user, existing?.label);
    cursors.set(clientID, cursor);
    if (cursor.label && !existing?.label) {
      options.getPortalElement().append(cursor.label.collisionRect);
    }
    if (options.showCursorLabels !== "always") {
      cursor.element.addEventListener("mouseenter", () => showCursor(cursor));
      cursor.element.addEventListener("mouseleave", () => scheduleHide(cursor));
    }
    showCursor(cursor);
    if (options.showCursorLabels !== "always") {
      scheduleHide(cursor);
    }
    return cursor.element;
  }

  function onAwarenessChange({
    updated,
    removed,
  }: {
    updated: number[];
    removed: number[];
  }) {
    for (const clientID of removed) {
      removeCursor(clientID);
    }
    for (const clientID of updated) {
      if (!options.hasCursor(clientID)) {
        removeCursor(clientID);
        continue;
      }
      const cursor = cursors.get(clientID);
      if (cursor && options.showCursorLabels !== "always") {
        showCursor(cursor);
        scheduleHide(cursor);
      }
    }
  }

  function destroy() {
    for (const clientID of cursors.keys()) {
      removeCursor(clientID);
    }
  }

  return { cursorBuilder, onAwarenessChange, destroy };
}
