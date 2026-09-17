import {
  autoUpdate,
  computePosition,
  flip,
  getOverflowAncestors,
  hide,
  shift,
  size,
} from "@floating-ui/dom";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

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

function defaultCursorRender(user: CollaborationUser) {
  const cursorElement = document.createElement("span");

  cursorElement.classList.add("bn-collaboration-cursor__base");

  const caretElement = document.createElement("span");
  caretElement.contentEditable = "false";
  caretElement.classList.add("bn-collaboration-cursor__caret");

  const labelElement = document.createElement("span");
  labelElement.classList.add("bn-collaboration-cursor__label");
  labelElement.textContent = user.name;

  const textColor = isDarkColor(user.color) ? "white" : "black";
  for (const element of [caretElement, labelElement]) {
    element.style.backgroundColor = user.color;
    element.style.color = textColor;
  }

  cursorElement.setAttribute("data-default", "");
  // Word joiners anchor the widget in the text without adding visible spacing.
  cursorElement.append("\u2060", caretElement, "\u2060");

  return {
    element: cursorElement,
    label: { element: labelElement, caret: caretElement },
  };
}

type FloatingLabel = {
  element: HTMLElement;
  caret: HTMLElement;
  positioning?: {
    ancestors: ReturnType<typeof getOverflowAncestors>;
    update: () => void;
    destroy: () => void;
  };
};

type Cursor = {
  element: HTMLElement;
  label?: FloatingLabel;
  hideTimeout?: ReturnType<typeof setTimeout>;
};

/** Shared DOM renderer for the Yjs 13 and Yjs 14 cursor plugins. */
export function createCollaborationCursorManager(options: {
  renderCursor?: (user: CollaborationUser) => HTMLElement;
  showCursorLabels?: "always" | "activity";
  getPortalElement: () => HTMLElement;
}) {
  const cursors = new Map<number, Cursor>();
  let view: EditorView | undefined;

  function stopPositioning(label: FloatingLabel) {
    label.positioning?.destroy();
    label.positioning = undefined;
    label.element.remove();
  }

  function positionLabel(cursor: Cursor) {
    const label = cursor.label;
    if (!label || !view || !view.dom.contains(cursor.element)) {
      return;
    }
    if (!cursor.element.hasAttribute("data-active")) {
      stopPositioning(label);
      return;
    }
    // A reused widget can move into a different table/scroll container. Refresh
    // autoUpdate's listeners when its clipping ancestors change.
    const ancestors = getOverflowAncestors(label.caret);
    const positioning = label.positioning;
    if (positioning) {
      if (
        ancestors.length === positioning.ancestors.length &&
        ancestors.every(
          (ancestor, index) => ancestor === positioning.ancestors[index],
        )
      ) {
        positioning.update();
        return;
      }
      stopPositioning(label);
    }

    const portal = options.getPortalElement();
    label.element.style.visibility = "hidden";
    portal.append(label.element);
    // Table ancestors constrain the caret's visibility, but not its label's
    // placement. Use the editor and its outer scroll containers as the boundary.
    const boundary = [
      view.dom,
      ...getOverflowAncestors(view.dom).filter(
        (ancestor): ancestor is Element => ancestor instanceof Element,
      ),
    ];
    const { element, caret } = label;
    let revision = 0;
    async function update() {
      const currentRevision = ++revision;
      const result = await computePosition(caret, element, {
        placement: "top-start",
        strategy: "fixed",
        middleware: [
          flip({
            boundary,
            fallbackPlacements: ["top-end", "bottom-start", "bottom-end"],
          }),
          shift({ boundary }),
          size({
            boundary,
            apply({ availableWidth, elements }) {
              elements.floating.style.maxWidth = `min(20rem, ${Math.max(0, availableWidth)}px)`;
            },
          }),
          hide({ strategy: "referenceHidden" }),
        ],
      });
      if (currentRevision !== revision || !element.isConnected) {
        return;
      }
      Object.assign(element.style, {
        left: `${result.x}px`,
        top: `${result.y}px`,
        visibility: result.middlewareData.hide?.referenceHidden
          ? "hidden"
          : "visible",
      });
      element.dataset.placement = result.placement;
    }
    const cleanup = autoUpdate(caret, element, update);
    label.positioning = {
      ancestors,
      update,
      destroy() {
        revision++;
        cleanup();
      },
    };
  }

  function hideCursor(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.element.removeAttribute("data-active");
    if (cursor.label) {
      stopPositioning(cursor.label);
    }
  }

  function showCursor(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.element.setAttribute("data-active", "");
    positionLabel(cursor);
  }

  function scheduleHide(cursor: Cursor) {
    clearTimeout(cursor.hideTimeout);
    cursor.hideTimeout = setTimeout(() => hideCursor(cursor), 2000);
  }

  function sync(nextView: EditorView) {
    view = nextView;
    for (const [clientID, cursor] of cursors) {
      if (!view.dom.contains(cursor.element)) {
        hideCursor(cursor);
        cursors.delete(clientID);
      } else {
        positionLabel(cursor);
      }
    }
  }

  function cursorBuilder(user: CollaborationUser, clientID: number) {
    const existing = cursors.get(clientID);
    if (existing) {
      return existing.element;
    }

    const cursor: Cursor = options.renderCursor
      ? { element: options.renderCursor(user) }
      : defaultCursorRender(user);
    cursors.set(clientID, cursor);
    if (options.showCursorLabels !== "always") {
      cursor.element.addEventListener("mouseenter", () => showCursor(cursor));
      cursor.element.addEventListener("mouseleave", () => scheduleHide(cursor));
      scheduleHide(cursor);
    }
    cursor.element.setAttribute("data-active", "");
    return cursor.element;
  }

  function onAwarenessChange({ updated }: { updated: number[] }) {
    if (options.showCursorLabels === "always") {
      return;
    }
    for (const clientID of updated) {
      const cursor = cursors.get(clientID);
      if (cursor) {
        showCursor(cursor);
        scheduleHide(cursor);
      }
    }
  }

  return {
    cursorBuilder,
    onAwarenessChange,
    plugin: new Plugin({
      view(initialView) {
        sync(initialView);
        return {
          update: sync,
          destroy() {
            for (const cursor of cursors.values()) {
              hideCursor(cursor);
            }
            cursors.clear();
            view = undefined;
          },
        };
      },
    }),
  };
}
