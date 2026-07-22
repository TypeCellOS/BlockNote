import {
  SuggestionMenu,
  SuggestionMenuOptions,
} from "@blocknote/core/extensions";
import { autoPlacement, offset, shift, size } from "@floating-ui/react";
import { useEffect, useMemo } from "react";

import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";
import { FloatingUIOptions } from "../../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../../Popovers/GenericPopover.js";
import { InlineEmojiPicker } from "./InlineEmojiPicker.js";

export function EmojiPickerController(props: {
  triggerCharacter: string;
  shouldOpen?: SuggestionMenuOptions["shouldOpen"];
  floatingUIOptions?: FloatingUIOptions;
  portalElement?: HTMLElement | null;
}) {
  const editorDOMElement = useEditorDOMElement();

  const { triggerCharacter, shouldOpen } = props;

  const suggestionMenu = useExtension(SuggestionMenu);

  useEffect(() => {
    suggestionMenu.addSuggestionMenu({ triggerCharacter, shouldOpen });
  }, [suggestionMenu, triggerCharacter, shouldOpen]);

  const state = useExtensionState(SuggestionMenu);
  const reference = useExtensionState(SuggestionMenu, {
    selector: (state) =>
      ({
        element: (editorDOMElement?.firstChild || undefined) as
          | Element
          | undefined,
        getBoundingClientRect: () => state?.referencePos || new DOMRect(),
      }) satisfies GenericPopoverReference,
  });

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: state?.show && state?.triggerCharacter === triggerCharacter,
        onOpenChange: (open) => {
          if (!open) {
            suggestionMenu.closeMenu();
          }
        },
        placement: "bottom-start",
        middleware: [
          offset(10),
          autoPlacement({
            allowedPlacements: ["bottom-start", "top-start"],
            padding: 10,
          }),
          shift(),
          size({
            apply({ elements, availableHeight }) {
              elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
            },
            padding: 10,
          }),
        ],
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        onMouseDownCapture: (event: React.MouseEvent) => event.preventDefault(),
        style: {
          zIndex: 70,
        },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [
      props.floatingUIOptions,
      state?.show,
      state?.triggerCharacter,
      suggestionMenu,
      triggerCharacter,
    ],
  );

  if (!state) {
    return null;
  }

  return (
    <GenericPopover
      reference={reference}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      <InlineEmojiPicker
        query={state.query}
        closeMenu={suggestionMenu.closeMenu}
        clearQuery={suggestionMenu.clearQuery}
      />
    </GenericPopover>
  );
}
