import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, BlockNoteEditor } from "@blocknote/core";
import { createReactBlockSpec, useComponentsContext } from "@blocknote/react";
import type React from "react";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiDeleteBinLine,
  RiPencilLine,
} from "react-icons/ri";
import { useEffect, useState, useSyncExternalStore } from "react";

import "./styles.css";

// Which tab is open is *view state*, not content: it belongs to the reader,
// not to the document. Block props are part of the document, so putting it
// there would sync it to every collaborator and add an undo step for a
// glance. BlockNote's own toggle blocks keep their state out of the document
// the same way, in `localStorage` keyed by block id.
//
// Nothing is stored until the reader picks a tab: with no entry, the first
// panel is the open one. The strip and the panels render in separate React
// roots, which is why this is a store rather than a context.
const openTabs = new Map<string, string>();
const listeners = new Set<() => void>();

function storageKey(tabsId: string) {
  return `tabs-open-${tabsId}`;
}

/** The panel the reader opened in this set, if they have opened one. */
function openTabId(tabsId: string): string | undefined {
  const known = openTabs.get(tabsId);
  if (known !== undefined) {
    return known;
  }
  try {
    return window.localStorage.getItem(storageKey(tabsId)) ?? undefined;
  } catch {
    // Private windows and blocked site data: fall back to the first panel.
    return undefined;
  }
}

function openTab(tabsId: string, tabId: string) {
  openTabs.set(tabsId, tabId);
  try {
    window.localStorage.setItem(storageKey(tabsId), tabId);
  } catch {
    // Not being able to remember the choice is not worth failing over.
  }
  listeners.forEach((listener) => listener());
}

/**
 * The panel that is open in this set: the reader's choice when they have made
 * one that still names a panel, and the first panel otherwise.
 */
function useActiveTabId(tabsId: string, tabs: Block<any, any, any>[]): string {
  const chosen = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => openTabId(tabsId),
    () => undefined,
  );

  // `tabs` is never empty: the schema gives the set `min: 1`.
  return tabs.find((tab) => tab.id === chosen)?.id ?? tabs[0].id;
}

/**
 * The panels of the tab set being rendered, read back from the editor.
 *
 * `props.block` is the snapshot the render closed over, so a handler that has
 * just inserted or removed a panel cannot see its own change there. The set
 * is on screen, so it not being in the document means this component outlived
 * its block, which is a bug rather than a state to render around.
 */
function panelsOf(editor: BlockNoteEditor<any, any, any>, tabsId: string) {
  const tabs = editor.getBlock(tabsId);
  if (!tabs) {
    throw new Error(`Tab set "${tabsId}" is not in the document`);
  }
  return tabs.children;
}

/** Whether `block` is, or contains, the block with `id`. */
function contains(block: Block<any, any, any>, id: string): boolean {
  return block.id === id || block.children.some((child) => contains(child, id));
}

/**
 * Opens whichever panel the caret ends up in.
 *
 * A hidden panel is still part of the document, so the editor will happily
 * move content into it - Backspace at the start of the block *after* a tab
 * set pulls that block into the last panel, which may not be the open one.
 * Without this the block simply disappears from view. Reacting to the
 * selection covers every route in (Backspace, Delete, arrow keys, drag and
 * drop, paste) instead of patching one key at a time.
 */
function useRevealCaretPanel(
  editor: BlockNoteEditor<any, any, any>,
  tabsId: string,
) {
  useEffect(
    () =>
      editor.onSelectionChange(() => {
        // Read the panels back from the editor rather than closing over
        // them: the block that just moved into one is not in the list this
        // effect was created with. A collaborator can dissolve the set
        // between the selection changing and this running, so a missing one
        // is expected here, unlike in the handlers below.
        const tabs = editor.getBlock(tabsId)?.children;
        if (!tabs) {
          return;
        }
        const here = editor.getTextCursorPosition().block;
        const panel = tabs.find((tab) => contains(tab, here.id));
        if (panel && openTabId(tabsId) !== panel.id) {
          openTab(tabsId, panel.id);
        }
      }),
    [editor, tabsId],
  );
}

/**
 * A tab panel. It only ever exists inside a `tabs` block, so it declares
 * `placeable: "namedOnly"` — the schema then keeps it out of every other
 * position, and BlockNote dissolves it into its blocks if it is moved out.
 *
 * Its props carry the label only. Which panel is open is the reader's own
 * state, so it is held outside the document (see the store above) - a block
 * prop would travel to every collaborator and cost an undo step.
 */
export const createTab = createReactBlockSpec(
  {
    type: "tab",
    propSchema: {
      label: { default: "Tab" },
    },
    content: "none",
    children: { allow: "blocks" },
    placeable: "namedOnly",
  },
  {
    // The panel reads its own open state, so it re-renders when the reader
    // switches tabs without the document changing at all.
    render: function TabPanel(props) {
      // `placeable: "namedOnly"` means a panel only ever exists inside a tab
      // set, so not finding one is a broken document rather than a state to
      // render around.
      const set = props.editor.getParentBlock(props.block.id);
      if (!set) {
        throw new Error(`Tab panel "${props.block.id}" has no tab set`);
      }
      const open = useActiveTabId(set.id, set.children) === props.block.id;

      return (
        <div
          className="tab-panel"
          role="tabpanel"
          aria-label={props.block.props.label}
          data-active={open}
          ref={props.contentRef}
        />
      );
    },
  },
);

/**
 * One tab in the strip, draggable to reorder. The whole tab is the handle, and
 * the sensor below only starts a drag after a few pixels of movement, so a
 * plain click still opens the tab or its menu.
 */
function SortableTab(props: {
  id: string;
  active: boolean;
  editing: boolean;
  children: React.ReactNode;
}) {
  // Not draggable while its title is being edited, so selecting text in the
  // field does not pick the tab up.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id, disabled: props.editing });

  return (
    <span
      ref={setNodeRef}
      className="tabs-tab"
      data-active={props.active}
      data-dragging={isDragging}
      // Translate only: tabs differ in width, and a full transform would
      // squash a tab to the size of the slot it is passing.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {props.children}
    </span>
  );
}

/** The tab strip plus the panels. */
export const createTabs = createReactBlockSpec(
  {
    type: "tabs",
    propSchema: {},
    content: "none",
    children: { allow: ["tab"], min: 1 },
  },
  {
    render: function TabStrip(props) {
      // The editor's own menu primitives, so the tab menu matches whichever
      // UI library `BlockNoteView` is using (Mantine, Ariakit or ShadCN)
      // instead of being styled by hand.
      const Components = useComponentsContext()!;
      // A few pixels of movement before a drag starts, so clicking a tab
      // still opens it rather than picking it up.
      const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
      );
      // The tab whose title is being edited in place, if any.
      const [editingId, setEditingId] = useState<string | undefined>(undefined);
      const tabs = props.block.children;
      useRevealCaretPanel(props.editor, props.block.id);
      const active = useActiveTabId(props.block.id, tabs);
      const activeIndex = tabs.findIndex((tab: any) => tab.id === active);

      // Removing a panel does not re-render its siblings: a panel re-renders
      // when its own block changes or when this store notifies, and a
      // sibling disappearing is neither. Each survivor therefore keeps the
      // `open` it last computed, which was `false` for all of them while the
      // removed panel was the chosen one - so the set would show nothing at
      // all. Storing the panel actually shown is what tells them.
      //
      // Nothing is stored until the reader has chosen, so this only ever
      // repairs a choice, never makes one.
      const ids = tabs.map((tab: any) => tab.id).join();
      useEffect(() => {
        const stored = openTabId(props.block.id);
        if (stored !== undefined && stored !== active) {
          openTab(props.block.id, active);
        }
        // `tabs` is a fresh array on every render; the ids are what matter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [ids, active, props.block.id]);

      const onDragEnd = (event: DragEndEvent) => {
        const from = tabs.findIndex((tab: any) => tab.id === event.active.id);
        const to = tabs.findIndex((tab: any) => tab.id === event.over?.id);
        if (from !== -1 && to !== -1 && from !== to) {
          move(from, to - from);
        }
      };

      // The caret follows the switch when it was inside the tab set: leaving
      // it in the panel that just closed would put the cursor somewhere the
      // reader cannot see, and `useRevealCaretPanel` would immediately reopen
      // that panel and undo the switch.
      const open = (index: number) => {
        const here = props.editor.getTextCursorPosition().block;
        const caretInside =
          props.editor.isFocused() &&
          tabs.some((tab: any) => contains(tab, here.id));

        // Opening a tab touches no document state, so it creates no undo
        // step and no change for collaborators.
        openTab(props.block.id, tabs[index].id);

        if (caretInside) {
          const landing = tabs[index].children[0];
          if (!landing) {
            throw new Error("A tab panel should hold a block for the caret");
          }
          props.editor.setTextCursorPosition(landing, "start");
        }
      };

      const addTab = () => {
        props.editor.insertBlocks(
          [{ type: "tab", props: { label: `Tab ${tabs.length + 1}` } } as any],
          tabs[tabs.length - 1],
          "after",
        );

        // Land in the new panel so it can be typed into straight away.
        const next = panelsOf(props.editor, props.block.id);
        const added = next[next.length - 1];
        const landing = added.children[0];
        if (!landing) {
          throw new Error("A new tab panel should hold a block to type in");
        }
        openTab(props.block.id, added.id);
        props.editor.setTextCursorPosition(landing, "start");
        props.editor.focus();
      };

      const removeTab = (index: number) => {
        if (tabs.length === 1) {
          return;
        }
        props.editor.removeBlocks([tabs[index]]);
        // One tab always survives, since the guard above refuses to remove
        // the last one.
        const next = panelsOf(props.editor, props.block.id);
        openTab(props.block.id, next[Math.min(index, next.length - 1)].id);
      };

      const move = (index: number, by: number) => {
        const to = index + by;
        if (to < 0 || to >= tabs.length) {
          return;
        }
        // One transaction, so a move is a single undo step - and so the id
        // is free again by the time it is re-inserted. Keeping it matters:
        // the reader's open panel is remembered by id, and a new one would
        // silently move their choice to another tab.
        props.editor.transact(() => {
          const moving = tabs[index];
          props.editor.removeBlocks([moving]);
          props.editor.insertBlocks(
            [moving as any],
            tabs[to],
            by < 0 ? "before" : "after",
          );
        });
      };

      // Arrow keys move between tabs, as a tablist is expected to.
      const onStripKeyDown = (event: React.KeyboardEvent) => {
        const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : event.key in deltas
                ? (activeIndex + deltas[event.key] + tabs.length) % tabs.length
                : undefined;
        if (next === undefined) {
          return;
        }
        event.preventDefault();
        open(next);
        // Keep the strip focused so the next arrow keeps stepping.
        (event.currentTarget as HTMLElement)
          .querySelectorAll<HTMLElement>("[role='tab']")
          [next]?.focus();
      };

      return (
        <div className="tabs">
          {/* Chrome, not document content: it lives outside `contentRef`. */}
          <div
            className="tabs-strip"
            role="tablist"
            contentEditable={false}
            suppressContentEditableWarning
            onKeyDown={onStripKeyDown}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={tabs.map((tab: any) => tab.id)}
                strategy={horizontalListSortingStrategy}
              >
                {tabs.map((tab: any, i: number) => {
                  const editing = tab.id === editingId;
                  const label = editing ? (
                    <input
                      className="tabs-label"
                      defaultValue={tab.props.label}
                      aria-label="Tab name"
                      autoFocus
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={(event) => {
                        const value = event.currentTarget.value.trim();
                        if (value && value !== tab.props.label) {
                          props.editor.updateBlock(tab, {
                            props: { label: value },
                          });
                        }
                        setEditingId(undefined);
                      }}
                      onKeyDown={(event) => {
                        // Keep the strip's arrow-key navigation out of the field.
                        event.stopPropagation();
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        } else if (event.key === "Escape") {
                          event.currentTarget.value = tab.props.label;
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="tabs-label"
                      role="tab"
                      aria-selected={i === activeIndex}
                      tabIndex={i === activeIndex ? 0 : -1}
                      onClick={() => open(i)}
                    >
                      {tab.props.label}
                    </button>
                  );

                  return (
                    <SortableTab
                      key={tab.id}
                      id={tab.id}
                      active={i === activeIndex}
                      editing={editing}
                    >
                      {/* Clicking a tab that is not open switches to it; clicking
                      the open one opens its menu, so the strip needs no
                      always-visible edit buttons. */}
                      {i === activeIndex && !editing ? (
                        <Components.Generic.Menu.Root position="bottom-start">
                          <Components.Generic.Menu.Trigger>
                            {label}
                          </Components.Generic.Menu.Trigger>
                          <Components.Generic.Menu.Dropdown>
                            <Components.Generic.Menu.Item
                              icon={<RiPencilLine />}
                              onClick={() => setEditingId(tab.id)}
                            >
                              Rename
                            </Components.Generic.Menu.Item>
                            {i > 0 && (
                              <Components.Generic.Menu.Item
                                icon={<RiArrowLeftLine />}
                                onClick={() => move(i, -1)}
                              >
                                Move left
                              </Components.Generic.Menu.Item>
                            )}
                            {i < tabs.length - 1 && (
                              <Components.Generic.Menu.Item
                                icon={<RiArrowRightLine />}
                                onClick={() => move(i, 1)}
                              >
                                Move right
                              </Components.Generic.Menu.Item>
                            )}
                            {tabs.length > 1 && (
                              <Components.Generic.Menu.Item
                                icon={<RiDeleteBinLine />}
                                onClick={() => removeTab(i)}
                              >
                                Delete tab
                              </Components.Generic.Menu.Item>
                            )}
                          </Components.Generic.Menu.Dropdown>
                        </Components.Generic.Menu.Root>
                      ) : (
                        label
                      )}
                    </SortableTab>
                  );
                })}
              </SortableContext>
            </DndContext>
            <button type="button" className="tabs-add" onClick={addTab}>
              + Tab
            </button>
          </div>
          <div className="tabs-body" ref={props.contentRef} />
        </div>
      );
    },
  },
);
