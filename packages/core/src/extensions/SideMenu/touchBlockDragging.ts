import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import { getNodeById } from "../../api/nodeUtil.js";
import { moveTouchDragImage } from "./dragging.js";
import {
  edgeScrollSpeed,
  keyboardAfterResize,
  type Keyboard,
} from "./touchBlockDraggingState.js";

const browseKey = new PluginKey<boolean>("touchBlockBrowsing");
const holdDelay = 450;
const holdMovementTolerance = 8;

/** Browsing changes native touch editing, not the application's edit permission. */
export function createTouchBlockDraggingPlugin(isEditable: () => boolean) {
  function syncDOM(view: EditorView) {
    const contentEditable = String(
      isEditable() && !browseKey.getState(view.state),
    );
    // Even assigning the same attribute produces a mutation. Avoid waking PM's
    // observer while focus moves to editor UI (for example the AI input).
    if (view.dom.contentEditable !== contentEditable) {
      view.dom.contentEditable = contentEditable;
    }
  }
  return new Plugin({
    key: browseKey,
    state: {
      init: () => false,
      apply: (tr, browsing) => {
        const value: unknown = tr.getMeta(browseKey);
        return typeof value === "boolean" ? value : browsing;
      },
    },
    props: {
      attributes: (state): Record<string, string> =>
        browseKey.getState(state)
          ? { class: "bn-touch-browse", tabindex: "0" }
          : { class: "" },
    },
    // This plugin is necessary: PM rewrites contenteditable on state/prop
    // updates. A one-off DOM toggle is lost after typing or remote edits.
    // props.editable would instead disable application commands/UI as well.
    // Keep application permission authoritative; suspend only native editing.
    view: (view) => {
      syncDOM(view);
      return { update: syncDOM };
    },
  });
}

type Point = { x: number; y: number };
type TouchSource = {
  controller: AbortController;
  identifier: number;
  id: string;
  block: HTMLElement;
  point: Point;
};
type Gesture = TouchSource &
  (
    | { type: "pending" }
    | {
        type: "dragging";
        transfer: DataTransfer;
        scroller: Element;
      }
  );

/** One ancestor walk checks ownership, embedded controls, and the nearest block. */
function touchBlock(target: EventTarget | null, editor: HTMLElement) {
  let block: HTMLElement | undefined;
  for (
    let element = target instanceof Element ? target : null;
    element && element !== editor;
    element = element.parentElement
  ) {
    // Leave embedded editors and interactive controls to their own gestures:
    // lifting their containing block would steal link activation, button taps,
    // form input, or native selection inside a custom editable node view.
    if (
      element.matches(
        '.bn-editor,a,button,input,textarea,select,[role="button"],[contenteditable="true"]',
      )
    ) {
      return undefined;
    }
    if (
      !block &&
      element instanceof HTMLElement &&
      element.classList.contains("bn-block-outer") &&
      element.dataset.id
    ) {
      block = element;
    }
    if (element.parentElement === editor) {
      return block;
    }
  }
  return undefined;
}

/**
 * A stationary touch lifts a block only outside text editing. Scrolling wins
 * until the hold completes; editing keeps native selection and long-press UI.
 * Native Safari gesture arbitration/keyboard behavior also needs device checks.
 */
export function registerTouchBlockDragging({
  view,
  isEditable,
  canDrag,
  startDrag,
  endDrag,
  signal,
}: {
  view: EditorView;
  isEditable: () => boolean;
  canDrag: (id: string) => boolean;
  startDrag: (event: DragEvent, id: string) => void;
  endDrag: () => void;
  signal: AbortSignal;
}) {
  if (signal.aborted) {
    return;
  }
  const document = view.dom.ownerDocument;
  const root = view.root;
  const window = document.defaultView!;
  const viewport = window.visualViewport;
  let touchInput =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  let gesture: Gesture | undefined;
  let keyboard: Keyboard | undefined;

  function browsing() {
    return browseKey.getState(view.state) === true;
  }

  function setBrowsing(value: boolean) {
    if (value !== browsing() && !view.isDestroyed) {
      view.dispatch(view.state.tr.setMeta(browseKey, value));
    }
  }

  function browse() {
    view.dom.blur();
    setBrowsing(true);
    keyboard = undefined;
  }

  // Safari decides whether text can be selected when contact starts. Switching
  // contentEditable inside touchstart is too late on physical iPhones. Establish
  // browsing before contact, without changing desktop or application permission.
  if (touchInput && isEditable() && !view.hasFocus()) {
    setBrowsing(true);
  }

  function watchKeyboard() {
    if (viewport) {
      keyboard = {
        type: "unseen",
        height: viewport.height,
        width: document.documentElement.clientWidth,
      };
    }
  }

  function edit(point: Point) {
    watchKeyboard();
    setBrowsing(false);
    const hit = view.posAtCoords({ left: point.x, top: point.y });
    if (hit) {
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.near(view.state.doc.resolve(hit.pos)),
        ),
      );
    }
    view.focus();
  }

  function event(type: string, point: Point, transfer: DataTransfer) {
    return new DragEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      dataTransfer: transfer,
    });
  }

  function over(current: Extract<Gesture, { type: "dragging" }>) {
    const { x, y } = current.point;
    moveTouchDragImage(x, y, current.block);
    view.root
      .elementFromPoint(x, y)
      ?.dispatchEvent(event("dragover", current.point, current.transfer));
  }

  function startScrolling(current: Extract<Gesture, { type: "dragging" }>) {
    const { signal } = current.controller;
    let previous: number | undefined;
    let frame = window.requestAnimationFrame(scroll);
    signal.addEventListener("abort", () => window.cancelAnimationFrame(frame), {
      once: true,
    });

    function scroll(time: number) {
      if (signal.aborted) {
        return;
      }
      // Clamp to the visible viewport: a scroll container may extend under the
      // software keyboard. Cap elapsed time to avoid jumps after a paused tab.
      const rect = current.scroller.getBoundingClientRect();
      const top = Math.max(rect.top, viewport?.offsetTop ?? 0);
      const bottom = Math.min(
        rect.bottom,
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      );
      const elapsed =
        previous === undefined
          ? 1 / 60
          : Math.min((time - previous) / 1000, 0.05);
      previous = time;
      const before = current.scroller.scrollTop;
      current.scroller.scrollTop +=
        edgeScrollSpeed(current.point.y, top, bottom) * elapsed;
      if (current.scroller.scrollTop !== before) {
        over(current);
      }
      frame = window.requestAnimationFrame(scroll);
    }
  }

  function finish(outcome: "drop" | "cancel") {
    const current = gesture;
    gesture = undefined;
    if (!current) {
      return;
    }
    // The gesture scope owns its hold timer, animation frame and source styling.
    // Every completion path (drop, extra finger, blur, unmount) cancels them here.
    current.controller.abort();
    if (current.type === "pending") {
      return;
    }
    if (outcome === "drop") {
      view.root
        .elementFromPoint(current.point.x, current.point.y)
        ?.dispatchEvent(event("drop", current.point, current.transfer));
    }
    (view.dom.parentElement ?? root).dispatchEvent(
      event("dragend", current.point, current.transfer),
    );
    endDrag();
    browse();
  }

  function lift() {
    const source = gesture;
    if (source?.type !== "pending") {
      return;
    }
    const info = getNodeById(source.id, view.state.doc);
    if (
      !isEditable() ||
      !info ||
      !source.block.isConnected ||
      !canDrag(source.id)
    ) {
      finish("cancel");
      return;
    }
    // Keep native text editing disabled throughout the lift. Editor permission
    // remains enabled for the drop pipeline, but Safari must not start a text
    // selection when the finger moves over the source during a block drag.
    setBrowsing(true);
    view.dom.blur();
    // A whole-surface lift is a block operation, not a text-caret drag. Keep
    // an existing block range if the lifted block belongs to it.
    const selection = view.state.selection;
    if (
      selection.toJSON().type === "text" ||
      info.posBeforeNode < selection.from ||
      info.posBeforeNode >= selection.to
    ) {
      view.dispatch(
        view.state.tr.setSelection(
          NodeSelection.create(view.state.doc, info.posBeforeNode),
        ),
      );
    }
    const transfer = new DataTransfer();
    const start = event("dragstart", source.point, transfer);
    startDrag(start, source.id);
    transfer.setData("blocknote/touch-drag", "true");
    // The browser cannot start native DnD after our hold timer. Reuse the
    // existing block drop pipeline instead. The editor parent identifies the
    // source to UniqueID, but bypasses PM's native text-dragstart handler.
    view.dom.parentElement!.dispatchEvent(start);
    let scroller = source.block.parentElement;
    while (
      scroller &&
      !(
        scroller.scrollHeight > scroller.clientHeight &&
        /auto|scroll/.test(window.getComputedStyle(scroller).overflowY)
      )
    ) {
      scroller = scroller.parentElement;
    }
    gesture = {
      ...source,
      type: "dragging",
      transfer,
      scroller: scroller ?? document.scrollingElement!,
    };
    source.block.classList.add("bn-touch-drag-source");
    source.controller.signal.addEventListener(
      "abort",
      () => source.block.classList.remove("bn-touch-drag-source"),
      { once: true },
    );
    over(gesture);
    startScrolling(gesture);
  }

  // Track taps outside text editing/embedded controls; only draggable blocks lift.
  view.dom.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        finish("cancel");
        return;
      }
      if (!isEditable() || (view.hasFocus() && !browsing())) {
        return;
      }
      const block = touchBlock(e.target, view.dom);
      if (!block || !block.dataset.id) {
        return;
      }
      finish("cancel");
      setBrowsing(true);
      const touch = e.touches[0];
      const point = { x: touch.clientX, y: touch.clientY };
      const pending: Extract<Gesture, { type: "pending" }> = {
        type: "pending",
        controller: new AbortController(),
        identifier: touch.identifier,
        id: block.dataset.id,
        block,
        point,
      };
      gesture = pending;
      if (canDrag(pending.id)) {
        const timer = setTimeout(lift, holdDelay);
        pending.controller.signal.addEventListener(
          "abort",
          () => clearTimeout(timer),
          { once: true },
        );
      }
    },
    { signal, capture: true, passive: true },
  );

  // Before pickup, movement yields to scrolling; afterward it drives the preview/drop target.
  view.dom.addEventListener(
    "touchmove",
    (e) => {
      const current = gesture;
      if (!current) {
        return;
      }
      const touch = Array.from(e.touches).find(
        (t) => t.identifier === current.identifier,
      );
      if (!touch || e.touches.length !== 1) {
        finish("cancel");
        return;
      }
      const point = { x: touch.clientX, y: touch.clientY };
      if (current.type === "pending") {
        // Do not preventDefault: native scrolling/pinch wins before lift.
        if (
          Math.hypot(point.x - current.point.x, point.y - current.point.y) >
          holdMovementTolerance
        ) {
          finish("cancel");
        }
        return;
      }
      e.preventDefault();
      current.point = point;
      over(current);
    },
    { signal, passive: false },
  );

  // Release commits a lifted block or turns a short, stationary contact into editing.
  view.dom.addEventListener(
    "touchend",
    (e) => {
      const current = gesture;
      if (!current) {
        return;
      }
      const touch = Array.from(e.changedTouches).find(
        (t) => t.identifier === current.identifier,
      );
      if (!touch) {
        return;
      }
      e.preventDefault();
      if (current.type === "dragging") {
        current.point = { x: touch.clientX, y: touch.clientY };
        finish("drop");
      } else {
        finish("cancel");
        edit({ x: touch.clientX, y: touch.clientY });
      }
    },
    { signal, passive: false },
  );
  // OS gesture interruption must never commit a drop.
  view.dom.addEventListener("touchcancel", () => finish("cancel"), { signal });
  // Suppress native text selection only while our recognizer owns the contact.
  view.dom.addEventListener(
    "selectstart",
    (e) => {
      if (gesture) {
        e.preventDefault();
      }
    },
    { signal },
  );
  // A second finger may land outside the editor while the first holds a block.
  view.root.addEventListener(
    "touchstart",
    (e) => {
      if ((e as TouchEvent).touches.length > 1) {
        finish("cancel");
      }
    },
    { signal, passive: true },
  );
  // Browsing substitutes block pickup for Safari's text/context-menu long press.
  view.dom.addEventListener(
    "contextmenu",
    (e) => {
      if (browsing() || gesture?.type === "dragging") {
        e.preventDefault();
      }
    },
    { signal },
  );
  // Do not let native DnD compete with our synthetic block pipeline.
  view.dom.addEventListener(
    "dragstart",
    (e) => {
      if (e.isTrusted && (browsing() || gesture)) {
        e.preventDefault();
      }
    },
    { signal, capture: true },
  );
  // Keyboard/programmatic focus hands control back to native editing.
  view.dom.addEventListener(
    "focus",
    () => {
      if (gesture?.type === "dragging") {
        return;
      }
      // A desktop window resize is not a software-keyboard dismissal.
      if (touchInput && !keyboard) {
        watchKeyboard();
      }
      setBrowsing(false);
    },
    { signal },
  );
  // Leaving touch editing arms the next hold before contact begins.
  view.dom.addEventListener(
    "blur",
    () => {
      if ((touchInput || keyboard) && !gesture) {
        browse();
      }
    },
    { signal },
  );
  // Hybrid devices can switch back to mouse/pen editing without a remount.
  view.root.addEventListener(
    "pointerdown",
    (e) => {
      if ((e as PointerEvent).pointerType === "touch") {
        touchInput = true;
        return;
      }
      touchInput = false;
      finish("cancel");
      keyboard = undefined;
      setBrowsing(false);
    },
    { signal, capture: true },
  );
  // iOS can dismiss its software keyboard without blurring the editor.
  viewport?.addEventListener(
    "resize",
    () => {
      if (!keyboard || browsing() || gesture) {
        return;
      }
      keyboard = keyboardAfterResize(keyboard, {
        height: viewport.height,
        scale: viewport.scale,
        layoutWidth: document.documentElement.clientWidth,
      });
      if (!keyboard) {
        browse();
      }
    },
    { signal },
  );
  // Backgrounding cancels a gesture; remount/teardown also restores native DOM editing.
  window.addEventListener("blur", () => finish("cancel"), { signal });
  signal.addEventListener(
    "abort",
    () => {
      finish("cancel");
      setBrowsing(false);
    },
    { once: true },
  );
}
