import { c, combinatorContentType } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import "./styles.css";

// The motivating combinator stack: a list of items, each carrying its own
// typed `label` prop and a body of full editor blocks. The Block.content JSON
// shape is automatically derived from the schema:
//   Array<{ props: { label: string }; content: Block[] }>
const tabsContentType = combinatorContentType(
  "tabs",
  c.list(
    c.props(
      { label: { default: "Tab" } },
      c.blocks(),
    ),
  ),
);

type TabItem = { props: { label: string }; content: any[] };

export const createTabs = createReactBlockSpec(
  {
    type: "tabs",
    propSchema: {},
    content: tabsContentType,
  },
  {
    render: (props) => {
      const tabs = (props.block.content as unknown as TabItem[]) ?? [];

      // React state for the visible tab. The full document (every tab's
      // content) lives in ProseMirror; this state only controls what the
      // user sees, via inline `display` styles applied in a layout effect
      // below.
      const [active, setActive] = useState(0);
      const activeIndex = Math.min(active, Math.max(tabs.length - 1, 0));

      // Inline-style toggle of which tab body is visible. We use inline
      // styles (not CSS) because Tiptap's React node view inserts a
      // `[data-node-view-content-react]` wrapper between this ref and the
      // tab item nodes — and inline styles are robust to that, where
      // `nth-child` / `>` selectors can drift if Tiptap's wrapper layout
      // ever changes.
      const bodyRef = useRef<HTMLDivElement | null>(null);
      const setBodyRefs = useCallback(
        (el: HTMLDivElement | null) => {
          bodyRef.current = el;
          props.contentRef(el);
        },
        [props.contentRef],
      );
      useLayoutEffect(() => {
        const root = bodyRef.current;
        if (!root) {
          return;
        }
        const items = root.querySelectorAll<HTMLElement>(
          '[data-content-name="tabs__item"]',
        );
        items.forEach((el, i) => {
          el.style.display = i === activeIndex ? "" : "none";
        });
      });

      const updateContent = (next: TabItem[], focusIndex?: number) => {
        props.editor.updateBlock(props.block, {
          type: "tabs",
          content: next as any,
        });
        if (focusIndex !== undefined) {
          setActive(focusIndex);
        }
      };

      const addTab = () => {
        const next: TabItem[] = [
          ...tabs,
          {
            props: { label: `Tab ${tabs.length + 1}` },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "New tab — type away.",
                    styles: {},
                  },
                ],
              },
            ],
          },
        ];
        updateContent(next, next.length - 1);
      };

      const removeTab = (i: number) => {
        if (tabs.length <= 1) {
          return;
        }
        const next = tabs.filter((_, idx) => idx !== i);
        updateContent(next, Math.max(0, Math.min(activeIndex, next.length - 1)));
      };

      const renameTab = (i: number) => {
        const current = tabs[i].props.label;
        // eslint-disable-next-line no-alert
        const next = window.prompt("Rename tab", current);
        if (next === null || next.trim() === "") {
          return;
        }
        const updated = tabs.map((t, idx) =>
          idx === i ? { ...t, props: { ...t.props, label: next } } : t,
        );
        updateContent(updated);
      };

      return (
        <div className="tabs">
          {/*
            Tab bar — non-editable; clicks switch React's `active` index. Each
            label is sourced from the corresponding item's `props.label` (a
            Tiptap attr stored on the tab item node).
          */}
          <div className="tabs-bar" contentEditable={false}>
            {tabs.map((tab, i) => (
              <div key={i} className="tab-button-wrapper">
                <button
                  className={
                    i === activeIndex
                      ? "tab-button tab-button-active"
                      : "tab-button"
                  }
                  onClick={() => setActive(i)}
                  onDoubleClick={() => renameTab(i)}
                  title="Click to switch · double-click to rename">
                  {tab.props.label || `Tab ${i + 1}`}
                </button>
                {tabs.length > 1 && (
                  <button
                    className="tab-close"
                    onClick={() => removeTab(i)}
                    title="Remove tab"
                    aria-label="Remove tab">
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className="tab-button tab-add"
              onClick={addTab}
              title="Add tab">
              + Add tab
            </button>
          </div>
          {/*
            Tab bodies — every tab's body is in the DOM; the layout effect
            above toggles `display` so only the active one is visible. Each
            body is a real block region: hit `/` inside it for the slash
            menu, drag/drop blocks, etc.
          */}
          <div className="tabs-bodies" ref={setBodyRefs} />
        </div>
      );
    },
  },
);
