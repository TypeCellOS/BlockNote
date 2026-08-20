import type { Slice } from "prosemirror-model";
import { PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

import { insertEmptyFirstChild } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import { getNearestBlockPos } from "../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import {
  createBlockDecorationPlugin,
  INVALIDATE_BLOCK_DECORATIONS,
} from "./blockDecorations.js";
import {
  getCollapsibleDropTargetPos,
  handleCollapsibleDrop,
} from "./collapsibleDrop.js";

export const collapsiblePluginKey = new PluginKey<DecorationSet>(
  "blocknote-collapsible",
);

/**
 * Where a block's collapse state is read from and written to. Collapse state is
 * per-user view state, so it lives outside the document.
 */
export type ToggledState = {
  set: (block: { id: string }, isToggled: boolean) => void;
  get: (block: { id: string }) => boolean;
};

const inMemoryToggledState = new Map<string, string>();

const inMemoryStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem: (key) => inMemoryToggledState.get(key) ?? null,
  setItem: (key, value) => void inMemoryToggledState.set(key, value),
};

/**
 * `localStorage`, or an in-memory stand-in wherever it can't be used. Reading it
 * throws on an opaque origin (how a server-side render sees a JSDOM document),
 * and writing it throws where storage is disabled or full (private browsing,
 * quota). Collapse state is presentational, so each operation degrades to the
 * in-memory map rather than taking the surrounding transaction — or render —
 * down with it.
 */
function collapseStorage(): Pick<Storage, "getItem" | "setItem"> {
  let storage: Storage | undefined;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      storage = window.localStorage;
    }
  } catch {
    // Falls through to the in-memory map.
  }

  if (!storage) {
    return inMemoryStorage;
  }

  return {
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return inMemoryStorage.getItem(key);
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value);
      } catch {
        inMemoryStorage.setItem(key, value);
      }
    },
  };
}

export const defaultToggledState: ToggledState = {
  set: (block, isToggled: boolean) =>
    collapseStorage().setItem(
      `toggle-${block.id}`,
      isToggled ? "true" : "false",
    ),
  get: (block) => collapseStorage().getItem(`toggle-${block.id}`) === "true",
};

export type CollapsibleOptions = {
  /**
   * Overrides where collapse state is persisted. Defaults to `localStorage`,
   * keyed by block ID.
   */
  toggledState?: ToggledState;
};

/**
 * Whether a block of `type` with `props` declares itself collapsible.
 *
 * Shared with the HTML exporter, which has to reproduce what the extension
 * renders without an editor view to read decorations from. It takes only the
 * schema rather than a whole editor, so an editor with a concrete block schema
 * can be passed without a cast.
 */
export function isBlockCollapsible(
  editor: Pick<BlockNoteEditor<any, any, any>, "schema">,
  type: string,
  props: Record<string, any>,
): boolean {
  const collapsible =
    editor.schema.blockSpecs[type]?.implementation?.meta?.collapsible;

  return typeof collapsible === "function"
    ? collapsible({ type, props })
    : !!collapsible;
}

/** The DOM id given to a collapsible block's child group, for `aria-controls`. */
export function collapsibleChildrenId(blockId: string): string {
  return `bn-collapse-children-${blockId}`;
}

/**
 * The chevron shown to the left of a collapsible block's content. It's the
 * disclosure control for the block's children, so it carries `aria-expanded`,
 * and `aria-controls` naming what it discloses where there is anything to name —
 * a childless block has no group to point at.
 */
export function createCollapseButton(
  expanded: boolean,
  controls?: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "bn-collapse-button";
  button.type = "button";
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
  if (controls) {
    button.setAttribute("aria-controls", controls);
  }
  button.innerHTML =
    // https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="CURRENTCOLOR"><path d="M320-200v-560l440 280-440 280Z"/></svg>';

  return button;
}

/**
 * Makes blocks collapsible. Blocks opt in via `meta.collapsible`, so this needs
 * no knowledge of specific block types.
 *
 * Everything it renders is a decoration, never a document change — collapse is
 * per-user state, and putting it in the document would push it into Yjs, undo
 * history, and exports.
 */
export const CollapsibleExtension = createExtension(
  ({
    editor,
    options,
  }: {
    editor: BlockNoteEditor<any, any, any>;
    options: CollapsibleOptions | undefined;
  }) => {
    const toggledState = options?.toggledState ?? defaultToggledState;

    const isExpanded = (id: string) => toggledState.get({ id });

    /** Redraws the decorations, for state that isn't in the document. */
    function invalidate() {
      // A headless editor has no view to redraw.
      if (editor.headless) {
        return;
      }

      editor.transact((tr) => tr.setMeta(INVALIDATE_BLOCK_DECORATIONS, true));
    }

    // Editability decides whether the "add a block" button renders, and so
    // whether the chevron is inert. Changing it doesn't dispatch a transaction
    // of its own, but tiptap emits an update for it, which is what `onChange`
    // listens to.
    let lastEditable: boolean;
    editor.onMount(() => {
      lastEditable = editor.isEditable;
    });
    editor.onChange(() => {
      if (editor.isEditable !== lastEditable) {
        lastEditable = editor.isEditable;
        invalidate();
      }
    });

    function createChevron(
      id: string,
      expanded: boolean,
      disabled: boolean,
      hasChildren: boolean,
    ) {
      const button = createCollapseButton(
        expanded,
        hasChildren ? collapsibleChildrenId(id) : undefined,
      );
      button.disabled = disabled;
      // Keeps the editor's selection (and focus) where it was.
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        toggledState.set({ id }, !isExpanded(id));
        invalidate();
      });

      return button;
    }

    /**
     * The "add a block" button shown under an expanded collapsible block with no
     * children, so its chevron has something to reveal. Wrapped because the
     * wrapper takes up a full line of the block's flex layout; the button itself
     * stays only as wide as its label.
     */
    function createAddBlockButton(getPos: () => number | undefined) {
      const wrapper = document.createElement("div");
      wrapper.className = "bn-collapse-add-block";

      const button = document.createElement("button");
      button.className = "bn-collapse-add-block-button";
      button.type = "button";
      button.textContent = editor.dictionary.toggle_blocks.add_block_button;
      // Keeps the editor's selection (and focus) where it was.
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        const pos = getPos();
        if (pos === undefined) {
          return;
        }

        editor.transact((tr) =>
          insertEmptyFirstChild(
            tr,
            getNearestBlockPos(tr.doc, pos).posBeforeNode,
          ),
        );
        editor.focus();
      });

      wrapper.appendChild(button);

      return wrapper;
    }

    const collapsiblePlugin = createBlockDecorationPlugin(
      collapsiblePluginKey,
      (info, pos, id, previous) => {
        const props = info.blockContent.node.attrs;
        if (!isBlockCollapsible(editor, info.blockNoteType, props)) {
          return [];
        }

        const childCount = info.childContainer?.node.childCount ?? 0;
        // The count as of the last time this block was decorated, carried on the
        // decoration so it lives and dies with the block. A block that has just
        // gained a child expands, rather than appearing to swallow it — note
        // that this writes collapse state from inside `apply`, which a remote
        // insert can therefore trigger. It's idempotent, and the write is to
        // per-user storage rather than the document.
        const lastChildCount = previous.find(
          (decoration) => decoration.spec.childCount !== undefined,
        )?.spec.childCount;

        if (childCount > (lastChildCount ?? childCount)) {
          toggledState.set({ id }, true);
        }

        const expanded = isExpanded(id);
        // Nothing to reveal, and no "add a block" button either.
        const disabled = childCount === 0 && !editor.isEditable;

        const decorations = [
          Decoration.node(
            pos,
            pos + info.bnBlock.node.nodeSize,
            {
              // For the CSS; screen readers use the chevron's `aria-expanded`.
              "data-collapsible": "true",
              ...(expanded ? {} : { "data-collapsed": "true" }),
            },
            { blockId: id, childCount },
          ),
          Decoration.widget(
            pos + 1,
            () => createChevron(id, expanded, disabled, childCount > 0),
            {
              blockId: id,
              side: -1,
              // Everything the button's DOM depends on, so ProseMirror reuses
              // it until one of them changes.
              key: `bn-collapse-button:${id}:${expanded}:${disabled}:${
                childCount > 0
              }`,
            },
          ),
        ];

        // Names the group the chevron discloses, for `aria-controls`.
        if (info.childContainer) {
          decorations.push(
            Decoration.node(
              info.childContainer.beforePos,
              info.childContainer.afterPos,
              { id: collapsibleChildrenId(id) },
              { blockId: id },
            ),
          );
        }

        // An expanded block with no children gets an "add a block" button, so
        // its chevron has something to reveal.
        if (expanded && editor.isEditable && childCount === 0) {
          decorations.push(
            Decoration.widget(
              info.blockContent.afterPos,
              (_view, getPos) => createAddBlockButton(getPos),
              { blockId: id, side: 1, key: `bn-collapse-add-block:${id}` },
            ),
          );
        }

        return decorations;
      },
      {
        handleDrop(view, event, slice, moved) {
          return handleCollapsibleDrop(
            getCollapsibleDropTargetPos(
              editor,
              isExpanded,
              view,
              event as DragEvent,
              slice,
            ),
            view,
            event as DragEvent,
            slice,
            moved,
          );
        },
      },
    );

    return {
      key: "collapsible",
      /**
       * Whether `block`'s children are currently hidden. Collapsible blocks
       * start collapsed.
       */
      isCollapsed: (block: { id: string }) => !isExpanded(block.id),
      /**
       * Collapses or expands `block`. This only changes what the user sees —
       * the document is untouched.
       */
      setCollapsed: (block: { id: string }, collapsed: boolean) => {
        toggledState.set({ id: block.id }, !collapsed);
        invalidate();
      },
      getDropTargetPos: (
        view: EditorView,
        event: { clientX: number; clientY: number },
        slice: Slice | undefined | null,
      ) => getCollapsibleDropTargetPos(editor, isExpanded, view, event, slice),
      prosemirrorPlugins: [collapsiblePlugin],
    } as const;
  },
);
