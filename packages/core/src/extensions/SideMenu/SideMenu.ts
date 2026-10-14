import { Plugin, PluginKey } from "@tiptap/pm/state";

import { Block } from "../../blocks/defaultBlocks.js";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { registerBlockDropHandlers } from "./blockDropHandling.js";
import { dragStart, unsetDragImage } from "./dragging.js";
import {
  HoveredBlock,
  isHeadingToMenu,
  Point,
  resolveHoveredBlock,
} from "./sideMenuHover.js";

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = UiElementPosition & {
  /**
   * The block that the side menu is attached to. While the menu is hidden
   * (`show` is `false`), the block it was last attached to, so it can animate
   * out next to it. The store's state is `undefined` until the menu first
   * shows.
   */
  block: Block<BSchema, I, S>;
};

/**
 * How far the areas around the editor where the side menu responds reach, in
 * px from the editor element's box. The editor element itself (including its
 * padding, where the menu sits) always counts.
 */
export type SideMenuOptions = {
  /**
   * How far left or right of the editor element the pointer still shows the
   * side menu, for the block at the pointer's height. Above or below the
   * editor, no block is at that height.
   * @default 0
   */
  hoverMargin?: number;
  /**
   * How far outside the editor element, on any side, a dragged block can still
   * be dropped into it (the drop goes to the nearest position in the editor).
   * @default 250
   */
  dropMargin?: number;
};

/**
 * How long the pointer may rest on its way to the menu (inside the triangle
 * from where it left the block to the menu) before the menu follows it to the
 * block it is over.
 */
const INTENT_TIMEOUT = 350;

/** The event's target as an element (text nodes resolve to their parent). */
function targetElement(target: EventTarget | null): Element | null {
  if (!target || !("nodeType" in target)) {
    return null;
  }
  const node = target as Node;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

export const sideMenuPluginKey = new PluginKey("SideMenuPlugin");

/**
 * Shows a menu next to the block the pointer is about. This
 * extension owns that decision: it listens to the pointer in `mount` and
 * writes the store; the UI only reads the store, positions the menu, and
 * registers the menu's element with `setMenuElement`.
 *
 * The block comes from the topmost element under the pointer (so an editor
 * covered by another element or editor gets no menu), falling back to probing
 * at the pointer's height when that element is padding or the gutter beside
 * the blocks. When the pointer leaves the block towards the menu, the menu
 * stays with the block while the pointer is inside the triangle from its exit
 * point to the menu, until it rests there for {@link INTENT_TIMEOUT}. Once on
 * the menu, leaving it anywhere but onto its block follows the pointer at
 * once. The menu hides when the pointer leaves the window.
 */
export const SideMenuExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<{ sideMenu?: SideMenuOptions } | undefined>) => {
    const store = createStore<SideMenuState<any, any, any> | undefined>(
      undefined,
    );

    const hoverMargin = options?.sideMenu?.hoverMargin ?? 0;

    let menuFrozen = false;
    let isDragOrigin = false;
    // The side menu's DOM element, registered by the UI that renders it.
    let menuElement: HTMLElement | undefined;
    // The last pointer position over this document.
    let pointer: Point | undefined;
    // The last pointer position over the active block (or the menu).
    let lastOnActive: Point | undefined;
    // Set while the pointer is heading from the active block to the menu.
    let intent:
      | { exit: Point; timer: ReturnType<typeof setTimeout> }
      | undefined;

    function isDraggable(type: string) {
      return editor.schema.blockSpecs[type].implementation.meta.draggable;
    }

    function clearIntent() {
      if (intent) {
        clearTimeout(intent.timer);
        intent = undefined;
      }
    }

    function hideMenu() {
      const state = store.state;
      if (state?.show) {
        store.setState({ ...state, show: false });
      }
    }

    function showMenu(hovered: HoveredBlock) {
      const block = editor.getBlock(hovered.id);
      if (!block) {
        hideMenu();
        return;
      }
      store.setState({
        show: true,
        // The hovered block's box: the menu goes next to the block itself, as
        // the React UI anchors it to the block's element.
        referencePos: hovered.node.getBoundingClientRect(),
        block,
      });
    }

    /**
     * Updates the menu for the pointer at `point` over `target`. With
     * `allowIntent`, a pointer heading to the menu keeps the active block.
     */
    function update(
      point: Point,
      target: Element | null,
      allowIntent: boolean,
    ) {
      // While a block is dragged by its handle, the menu must stay as it is:
      // the handle is the drag source, and if the menu hid or moved, React would
      // remove it from the DOM, so its `dragend` (and `blockDragEnd`, which
      // removes the drag image) would never fire. The drop's document change
      // otherwise re-resolves the block at the pointer's pre-drag position.
      if (menuFrozen || isDragOrigin) {
        // Frozen or dragging: keep the menu as it is.
        return;
      }
      if (target && menuElement?.contains(target)) {
        // On the menu: the pointer got where it was heading. Recording the
        // point here makes it the exit point if the pointer leaves the menu,
        // and as nothing is closer to the menu than the menu, leaving it
        // anywhere but onto its block follows the pointer at once.
        clearIntent();
        lastOnActive = point;
        // On the menu: keep the menu as it is.
        return;
      }

      if (!editor.isEditable) {
        clearIntent();
        hideMenu();
        // Read-only editor: hide the menu.
        return;
      }

      const resolution = resolveHoveredBlock(
        editor.prosemirrorView,
        target,
        point,
        isDraggable,
        editor.isWithinEditor,
        hoverMargin,
      );
      if (resolution.kind === "editorUI") {
        // On other UI of the editor (e.g. a toolbar): keep the menu as it is.
        return;
      }

      const state = store.state;
      const active = state?.show ? state.block.id : undefined;
      if (resolution.kind === "block" && resolution.block.id === active) {
        clearIntent();
        lastOnActive = point;
        // On the block of the menu: keep the menu as it is.
        return;
      }

      if (allowIntent && active !== undefined && menuElement?.isConnected) {
        const exit = intent?.exit ?? lastOnActive ?? point;
        if (isHeadingToMenu(point, exit, menuElement.getBoundingClientRect())) {
          // Restarts the timeout, so it measures how long the pointer rests.
          clearIntent();
          intent = { exit, timer: setTimeout(releaseIntent, INTENT_TIMEOUT) };
          // On the way to the menu: keep the menu on its block for now.
          return;
        }
      }

      // Not on the way to the menu: show the menu for the block under the
      // pointer, or hide it if there is no block.
      clearIntent();
      if (resolution.kind === "block") {
        lastOnActive = point;
        showMenu(resolution.block);
      } else {
        hideMenu();
      }
    }

    function endBlockDrag() {
      unsetDragImage(editor.prosemirrorView.root);
      isDragOrigin = false;
    }

    /** The pointer rested on its way to the menu: follow it after all. */
    function releaseIntent() {
      intent = undefined;
      refresh();
    }

    /**
     * Re-resolves the block for the last pointer position, without intent,
     * e.g. after a document change. If the pointer is on the menu (e.g. it
     * clicked a menu button), this resolves just right of the menu instead:
     * the menu is next to its block, so that point is on the line of the block,
     * in its column. The pointer itself can be over another block, e.g. the
     * "+" of a block in a column is over the column to its left. If the block
     * was removed, the block that moved up into its place takes over.
     */
    function refresh() {
      if (!pointer) {
        return;
      }
      const view = editor.prosemirrorView;
      const menu = menuElement?.isConnected
        ? menuElement.getBoundingClientRect()
        : undefined;
      const onMenu =
        menu !== undefined &&
        pointer.x >= menu.left &&
        pointer.x <= menu.right &&
        pointer.y >= menu.top &&
        pointer.y <= menu.bottom;
      const point = onMenu ? { x: menu.right + 1, y: pointer.y } : pointer;
      // Looks past other UI of the editor at what is underneath.
      const target =
        view.root
          .elementsFromPoint(point.x, point.y)
          .find(
            (element) =>
              view.dom.contains(element) || !editor.isWithinEditor(element),
          ) ?? null;
      update(point, target, false);
    }

    return {
      key: "sideMenu",
      store,
      prosemirrorPlugins: [
        new Plugin({
          key: sideMenuPluginKey,
          appendTransaction: (transactions, _oldState, newState) => {
            if (transactions.some((tr) => tr.getMeta("uiEvent") === "drop")) {
              // Forces a `scrollIntoView` immediately after a drop. Fixes WebKit
              // specific behavior where focusing scrolls the selection into
              // view. This happens on drop before ProseMirror updates the
              // document/selection, which is incorrect.
              return newState.tr.scrollIntoView();
            }
            return null;
          },
        }),
      ],
      mount({
        root,
        signal,
      }: {
        root: Document | ShadowRoot;
        signal: AbortSignal;
      }) {
        registerBlockDropHandlers(
          editor.prosemirrorView,
          () => isDragOrigin,
          options?.sideMenu?.dropMargin ?? 250,
          signal,
        );

        // Shows or updates the menu whenever the pointer moves, unless frozen.
        root.addEventListener(
          // `mousemove`, not `pointermove`: iOS Safari delivers a tap as a hover
          // (one compatibility `mousemove` to the tap point, then the click),
          // which is how the side menu shows on phones.
          "mousemove",
          (event) => {
            // Synthetic events created via `new Event("mousemove")` (e.g.
            // dispatched by browser extensions) have no `clientX`/`clientY`,
            // which would make `elementsFromPoint` throw on the resulting
            // non-finite coordinates.
            const { clientX, clientY, buttons } = event as Partial<MouseEvent>;
            if (
              menuFrozen ||
              typeof clientX !== "number" ||
              typeof clientY !== "number" ||
              !Number.isFinite(clientX) ||
              !Number.isFinite(clientY)
            ) {
              return;
            }
            if (isDragOrigin && buttons === 0) {
              // The drag ended without `dragend` reaching the handle (e.g. the
              // menu was unmounted by its controller): clean up now.
              endBlockDrag();
            }
            const point = { x: clientX, y: clientY };
            pointer = point;
            update(point, targetElement(event.target), true);
          },
          { signal, capture: true },
        );

        // The pointer left the window: no block is hovered any more. Only
        // `mouseout` reports this (with no `relatedTarget`), as `mouseleave`
        // doesn't reach a document or shadow root.
        root.addEventListener(
          "mouseout",
          (event) => {
            if (
              (event as MouseEvent).relatedTarget === null &&
              !menuFrozen &&
              !isDragOrigin
            ) {
              pointer = undefined;
              clearIntent();
              hideMenu();
            }
          },
          { signal, capture: true },
        );

        // Hides the menu whenever the user types.
        root.addEventListener(
          "keydown",
          () => {
            if (store.state?.show && editor.isFocused()) {
              clearIntent();
              hideMenu();
            }
          },
          { signal, capture: true },
        );

        // Needed in cases where the document changes without the pointer
        // moving: blocks move under it when blocks above it change. For
        // example, a side menu button which removes the block can cause the
        // block below to jump up into the place of the removed block when
        // clicked, allowing the user to click the button again without moving
        // the pointer. This would otherwise not update the side menu, and so
        // clicking the button again would attempt to remove the same block
        // again, causing an error.
        const unsubscribeOnChange = editor.onChange(() => {
          if (store.state?.show) {
            clearIntent();
            refresh();
          }
        });

        signal.addEventListener("abort", () => {
          unsubscribeOnChange();
          clearIntent();
          hideMenu();
        });
      },

      /**
       * Registers the element that renders the side menu. Moving the pointer
       * from a block towards this element keeps the menu on that block, and
       * hovering it never changes the block.
       */
      setMenuElement(element: HTMLElement | undefined) {
        menuElement = element;
      },

      /**
       * Handles drag & drop events for blocks.
       */
      blockDragStart(
        event: { dataTransfer: DataTransfer | null; clientY: number },
        block: Block<any, any, any>,
      ) {
        isDragOrigin = true;
        dragStart(event, block, editor);
      },

      /**
       * Handles drag & drop events for blocks.
       */
      blockDragEnd() {
        endBlockDrag();
        editor.blur();
      },

      /**
       * Whether the side menu is currently frozen (e.g. because the drag handle
       * menu is open).
       */
      get menuFrozen() {
        return menuFrozen;
      },

      /**
       * Freezes the side menu. When frozen, the side menu will stay
       * attached to the same block regardless of which block is hovered by the
       * mouse cursor.
       */
      freezeMenu() {
        menuFrozen = true;
        clearIntent();
        const state = store.state;
        if (state) {
          store.setState({ ...state, show: true });
        }
      },

      /**
       * Unfreezes the side menu. When frozen, the side menu will stay
       * attached to the same block regardless of which block is hovered by the
       * mouse cursor.
       */
      unfreezeMenu() {
        menuFrozen = false;
        hideMenu();
      },

      /**
       * Hides the side menu unless it is currently frozen (e.g. the drag
       * handle menu is open). Used to dismiss the menu on scroll without
       * interfering with open submenus.
       */
      hideMenuIfNotFrozen() {
        // A drag can scroll the page, but hiding the menu would remove the drag
        // source (see `update`).
        if (!menuFrozen && !isDragOrigin) {
          clearIntent();
          hideMenu();
        }
      },
    } as const;
  },
);
