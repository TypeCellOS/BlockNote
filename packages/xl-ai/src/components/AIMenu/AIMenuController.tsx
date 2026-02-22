import {
  BlockPopover,
  FloatingUIOptions,
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { autoUpdate, flip, offset, size } from "@floating-ui/react";
import { FC, useMemo } from "react";

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
    () =>
      ({
        ...props.floatingUIOptions,
        useFloatingOptions: {
          open: aiMenuState !== "closed",
          placement: "bottom",
          middleware: [
            offset(10),
            flip(),
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
          whileElementsMounted(reference, floating, update) {
            return autoUpdate(reference, floating, update, {
              animationFrame: true,
            });
          },
          ...props.floatingUIOptions?.useFloatingOptions,
        },
        useDismissProps: {
          enabled:
            aiMenuState === "closed" || aiMenuState.status === "user-input",
          // We should just be able to set `referencePress: true` instead of
          // using this listener, but this doesn't seem to trigger.
          // (probably because we don't assign the referenceProps to the reference element)
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
          ...props.floatingUIOptions?.useDismissProps,
        },
        elementProps: {
          style: {
            zIndex: 100,
          },
          ...props.floatingUIOptions?.elementProps,
        },
        // we use the focus manager instead of `autoFocus={true}` to prevent "page-scrolls-to-top-when-opening-the-floating-element"
        // see https://floating-ui.com/docs/floatingfocusmanager#page-scrolls-to-top-when-opening-the-floating-element
        focusManagerProps: {
          disabled: false,
          ...props.floatingUIOptions?.focusManagerProps,
        },
      }) satisfies FloatingUIOptions,
    [ai, aiMenuState, blockId, props.floatingUIOptions],
  );

  const Component = props.aiMenu || AIMenu;

  return (
    <BlockPopover blockId={blockId} {...floatingUIOptions}>
      {aiMenuState !== "closed" && <Component />}
    </BlockPopover>
  );
};
