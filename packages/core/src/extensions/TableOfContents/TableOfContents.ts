import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { prefersReducedMotion } from "../../util/prefersReducedMotion.js";
import { BLOCK_SELECTOR, getBlockElementForNode } from "../blockDOM.js";
import {
  areEntriesEqual,
  collectHeadings,
  getTableOfContentsEntries,
  mayHaveChangedHeadings,
  type TableOfContentsEntry,
} from "./entries.js";
import {
  findScrollContainer,
  getScrollContainer,
  type ScrollContainer,
} from "./scrollContainer.js";

export type { TableOfContentsEntry } from "./entries.js";

export type TableOfContentsOptions = {
  /**
   * The deepest entries listed, counted from the shallowest heading level in
   * the document: 0 lists only those headings, 1 also the level below them,
   * and so on.
   * @default 1
   */
  maxDepth?: number;
  /**
   * Returns the element the editor scrolls in. Called once, the first time
   * the outline needs it after the editor mounts, so it can read a React ref.
   * @default the nearest element, from the editor up, whose overflow scrolls, else the page
   */
  scrollContainer?: () => Element | null | undefined;
  /**
   * Distance in pixels from the top of the scroll container to the reading
   * line, e.g. the height of a sticky header over the editor. A heading's
   * entry becomes active once the heading scrolls up to the line, and
   * navigating to an entry scrolls its heading to the line.
   * @default 0
   */
  scrollOffset?: number;
};

export type TableOfContentsState = {
  /**
   * The entries in document order. Keeps its identity while the headings stay
   * the same, so editing other blocks doesn't re-render the outline.
   */
  entries: TableOfContentsEntry[];
  /**
   * The entry of the section being read: the last one whose heading has
   * scrolled up to the reading line, else the first one, and the last one
   * once scrolled to the bottom. `undefined` when there are no entries.
   */
  activeBlockId: string | undefined;
};

/** Absorbs sub-pixel rounding of a heading scrolled exactly to the line. */
const READING_LINE_TOLERANCE = 1;
/** How close to the bottom of the container counts as scrolled to it. */
const SCROLLED_TO_BOTTOM_TOLERANCE = 8;

/**
 * Lists the document's headings and tracks which one the reader is at.
 */
export const TableOfContentsExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<TableOfContentsOptions | undefined>) => {
    const maxDepth = options?.maxDepth ?? 1;
    const scrollOffset = options?.scrollOffset ?? 0;

    const store = createStore<TableOfContentsState>({
      entries: [],
      activeBlockId: undefined,
    });

    function setActive(activeBlockId: string | undefined) {
      if (store.state.activeBlockId !== activeBlockId) {
        store.setState({ ...store.state, activeBlockId });
      }
    }

    // Set while mounted.
    let mountedScrollToEntry: ((blockId: string) => void) | undefined;

    return {
      key: "tableOfContents",
      store,
      mount({ dom, signal }: { dom: HTMLElement; signal: AbortSignal }) {
        let prevDoc = editor.prosemirrorState.doc;
        let container: ScrollContainer | undefined;
        // The heading elements by block id. Rebuilt when the entries change,
        // or when one of them was re-rendered as a new element.
        let targets = new Map<string, Element>();
        let targetsDirty = true;
        let frame: number | undefined;
        // Undefined in jsdom.
        const resizeObserver =
          typeof ResizeObserver === "undefined"
            ? undefined
            : new ResizeObserver(scheduleUpdate);

        function setEntries(entries: TableOfContentsEntry[]) {
          if (areEntriesEqual(entries, store.state.entries)) {
            return;
          }
          const { activeBlockId } = store.state;
          store.setState({
            entries,
            activeBlockId: entries.some((e) => e.blockId === activeBlockId)
              ? activeBlockId
              : undefined,
          });
          targetsDirty = true;
          scheduleUpdate();
        }

        function getContainer(): ScrollContainer {
          if (!container) {
            container = getScrollContainer(
              options?.scrollContainer?.() ?? findScrollContainer(dom),
            );
            container.eventTarget.addEventListener("scroll", scheduleUpdate, {
              passive: true,
              signal,
            });
            // Headings move without scrolling when the layout changes.
            resizeObserver?.observe(dom);
            resizeObserver?.observe(container.element);
            dom.ownerDocument.defaultView?.addEventListener(
              "resize",
              scheduleUpdate,
              { signal },
            );
          }
          return container;
        }

        function getTarget(blockId: string): Element | undefined {
          if (targetsDirty || targets.get(blockId)?.isConnected === false) {
            indexTargets();
          }
          return targets.get(blockId);
        }

        function indexTargets() {
          const ids = new Set(store.state.entries.map((e) => e.blockId));
          targets = new Map();
          for (const { blockId, pos } of collectHeadings(
            editor.prosemirrorState.doc,
          )) {
            const element =
              ids.has(blockId) &&
              getBlockElementForNode(editor.prosemirrorView, pos, blockId);
            if (element) {
              targets.set(blockId, element);
            }
          }
          targetsDirty = false;
        }

        function update() {
          const { entries } = store.state;
          if (entries.length === 0) {
            return;
          }
          const { element, getVisibleTop } = getContainer();
          const readingLine =
            getVisibleTop() + scrollOffset + READING_LINE_TOLERANCE;
          let active = entries[0].blockId;
          for (const entry of entries) {
            const rect = getLaidOutRect(getTarget(entry.blockId));
            if (!rect) {
              continue;
            }
            if (rect.top > readingLine) {
              break;
            }
            active = entry.blockId;
          }
          // The last headings can be unable to scroll up to the reading line,
          // so once scrolled to the bottom, the last entry wins.
          if (
            element.scrollTop > 0 &&
            element.scrollTop + element.clientHeight >=
              element.scrollHeight - SCROLLED_TO_BOTTOM_TOLERANCE
          ) {
            const last = entries.findLast((entry) =>
              getLaidOutRect(getTarget(entry.blockId)),
            );
            active = last?.blockId ?? active;
          }
          setActive(active);
        }

        function scheduleUpdate() {
          frame ??= requestAnimationFrame(() => {
            frame = undefined;
            update();
          });
        }

        mountedScrollToEntry = (blockId) => {
          const target = getTarget(blockId);
          if (!target) {
            return;
          }
          const { element, getVisibleTop } = getContainer();
          // `scrollTo` clamps `top` to the scrollable range.
          element.scrollTo({
            top:
              element.scrollTop +
              getScrollTarget(target).getBoundingClientRect().top -
              getVisibleTop() -
              scrollOffset,
            behavior: prefersReducedMotion() ? "instant" : "smooth",
          });
        };

        setEntries(getTableOfContentsEntries(prevDoc, maxDepth));
        // Also when the entries are those of an earlier mount: the first
        // update is what starts listening to the scroll container.
        scheduleUpdate();
        const unsubscribe = editor.onChange(() => {
          const next = editor.prosemirrorState.doc;
          const changed = mayHaveChangedHeadings(prevDoc, next);
          prevDoc = next;
          if (changed) {
            setEntries(getTableOfContentsEntries(next, maxDepth));
          }
        });

        return () => {
          unsubscribe();
          resizeObserver?.disconnect();
          if (frame !== undefined) {
            cancelAnimationFrame(frame);
          }
          mountedScrollToEntry = undefined;
        };
      },
      /**
       * Scrolls the heading of an entry to the reading line, smoothly unless
       * the user prefers reduced motion.
       */
      scrollToEntry: (blockId: string) => mountedScrollToEntry?.(blockId),
    } as const;
  },
);

/** The element's box, unless it isn't laid out (e.g. in a closed toggle). */
function getLaidOutRect(element: Element | undefined): DOMRect | undefined {
  const rect = element?.getBoundingClientRect();
  return rect && (rect.width !== 0 || rect.height !== 0) ? rect : undefined;
}

/**
 * The heading's element, or for a heading in a closed toggle, the nearest
 * block around it that is laid out.
 */
function getScrollTarget(heading: Element): Element {
  for (
    let block: Element | null = heading;
    block;
    block = block.parentElement?.closest(BLOCK_SELECTOR) ?? null
  ) {
    if (getLaidOutRect(block)) {
      return block;
    }
  }
  return heading;
}
