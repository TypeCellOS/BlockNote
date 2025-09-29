import { useBlockNoteEditor } from "@blocknote/react";
import { FC, useEffect, useState } from "react";
import { useStore } from "zustand";

import { getAIExtension } from "../../AIExtension.js";
import { AIMenu, AIMenuProps } from "./AIMenu.js";
import { BlockPositioner } from "./BlockPositioner.js";

export const AIMenuController = (props: { aiMenu?: FC<AIMenuProps> }) => {
  const editor = useBlockNoteEditor();
  const ai = getAIExtension(editor);

  const aiMenuState = useStore(ai.store, (state) => state.aiMenuState);

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

  const Component = props.aiMenu || AIMenu;

  const [aiWriting, setAiWriting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollInProgress, setScrollInProgress] = useState(false);

  // Converts the `aiMenuState` status to a boolean which shows if the AI is
  // writing or not. This allows for proper reactivity in other `useEffect`
  // hooks, while using the base `aiMenuState` object would constantly
  // retrigger them.
  useEffect(() => {
    if (
      typeof aiMenuState === "object" &&
      "status" in aiMenuState &&
      aiMenuState.status === "ai-writing"
    ) {
      setAiWriting(true);
    } else {
      setAiWriting(false);
    }
  }, [aiMenuState]);

  // Enables auto scrolling when the AI starts writing and disables it when it
  // stops writing.
  useEffect(() => {
    if (aiWriting) {
      setAutoScroll(true);
    } else {
      setAutoScroll(false);
    }
  }, [aiWriting]);

  // Scrolls to the block being edited by the AI while auto scrolling is
  // enabled.
  useEffect(() => {
    const scrollToBottom = () => {
      if (!autoScroll) {
        return;
      }

      const blockElement = editor.domElement?.querySelector(
        `[data-node-type="blockContainer"][data-id="${blockId}"]`,
      );
      blockElement?.scrollIntoView({ block: "center" });
    };

    const destroy = editor.onChange(scrollToBottom);

    return () => destroy();
  }, [autoScroll, blockId, editor]);

  // Listens for `scroll` and `scrollend` events to see if a new scroll was
  // started before an existing one ended. This is the most reliable way we
  // have of checking if a scroll event was caused by the user and not by
  // `scrollIntoView`, as the events are otherwise indistinguishable. If a
  // scroll was started before an existing one finished (meaning the user has
  // scrolled), auto scrolling is disabled.
  useEffect(() => {
    const scrollHandler = () => {
      if (scrollInProgress) {
        setAutoScroll(false);
      }

      setScrollInProgress(true);
    };
    const scrollEndHandler = () => setScrollInProgress(false);

    // Need to set capture to `true` so the events get handled regardless of
    // which element gets scrolled.
    document.addEventListener("scroll", scrollHandler, true);
    document.addEventListener("scrollend", scrollEndHandler, true);

    return () => {
      document.removeEventListener("scroll", scrollHandler, true);
      document.removeEventListener("scrollend", scrollEndHandler, true);
    };
  }, [scrollInProgress]);

  return (
    <BlockPositioner
      canDismissViaOutsidePress={
        aiMenuState === "closed" || aiMenuState.status === "user-input"
      }
      blockID={blockId}
      onOpenChange={(open) => {
        if (open || aiMenuState === "closed") {
          return;
        }
        if (aiMenuState.status === "user-input") {
          ai.closeAIMenu();
        } else if (
          aiMenuState.status === "user-reviewing" ||
          aiMenuState.status === "error"
        ) {
          ai.rejectChanges();
        }
      }}
    >
      <Component />
    </BlockPositioner>
  );
};
