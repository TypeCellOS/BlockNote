import {
  BlockPopover,
  FloatingUIOptions,
  useBlockNoteEditor,
} from "@blocknote/react";
import { FC, useMemo } from "react";
import { useExtension, useExtensionState } from "@blocknote/react";
import { offset, size } from "@floating-ui/react";

import { AIExtension } from "../../AIExtension.js";
import { AIMenu, AIMenuProps } from "./AIMenu.js";

export const AIMenuController = (props: {
  aiMenu?: FC<AIMenuProps>;
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const editor = useBlockNoteEditor();
  const ai = useExtension(AIExtension);

  const aiMenuState = useExtensionState(AIExtension, {
    editor,
    selector: (state) => state.aiMenuState,
  });

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: aiMenuState !== "closed",
        placement: "bottom",
        middleware: [
          offset(10),
          // flip(),
          size({
            apply({ rects, elements }) {
              Object.assign(elements.floating.style, {
                width: `${rects.reference.width}px`,
              });
            },
          }),
        ],
        onOpenChange: (open) => {
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
        },
      },
      useDismissProps: {
        enabled:
          aiMenuState === "closed" || aiMenuState.status === "user-input",
        // We should just be able to set `referencePress: true` instead of
        // using this listener, but for some reason it doesn't seem to trigger.
        outsidePress: (event) => {
          if (event.target instanceof Element) {
            const blockElement = event.target.closest(".bn-block");
            if (
              blockElement &&
              blockElement.getAttribute("data-id") === blockId
            ) {
              ai.closeAIMenu();
            }
          }

          return true;
        },
      },
      elementProps: {
        style: {
          zIndex: 100,
        },
      },
      ...props.floatingUIOptions,
    }),
    [ai, aiMenuState, blockId, props.floatingUIOptions],
  );

  const Component = props.aiMenu || AIMenu;

  return (
    <BlockPopover blockId={blockId} {...floatingUIOptions}>
      {aiMenuState !== "closed" && <Component />}
    </BlockPopover>
  );
};
