import {
  SuggestionMenu,
  type SuggestionMenuOptions,
} from "@blocknote/core/extensions";
import { type Middleware } from "@floating-ui/react";
import { type ReactNode, useEffect, useMemo } from "react";

import { PortalElementOverride } from "../../editor/PortalElementOverride.js";
import { useEditorDOMElement } from "../../hooks/useEditorDomElement.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../Popovers/GenericPopover.js";
import { suggestionMenuMiddleware } from "./suggestionMenuMiddleware.js";

/** Shared positioning and registration for the public suggestion controllers. */
export function SuggestionMenuPopover(props: {
  triggerCharacter: string;
  shouldOpen?: SuggestionMenuOptions["shouldOpen"];
  minQueryLength?: number;
  floatingUIOptions?: FloatingUIOptions;
  portalElement?: HTMLElement | null;
  enabled?: boolean;
  middleware?: Middleware[];
  zIndex?: number;
  children: (props: {
    query: string;
    closeMenu: () => void;
    clearQuery: () => void;
  }) => ReactNode;
}) {
  const {
    triggerCharacter,
    shouldOpen,
    minQueryLength,
    enabled = true,
    middleware = suggestionMenuMiddleware,
    zIndex = 80,
  } = props;
  const editorDOMElement = useEditorDOMElement();
  const suggestionMenu = useExtension(SuggestionMenu);

  useEffect(() => {
    if (enabled) {
      suggestionMenu.addSuggestionMenu({ triggerCharacter, shouldOpen });
    }
  }, [enabled, suggestionMenu, triggerCharacter, shouldOpen]);

  const state = useExtensionState(SuggestionMenu);
  const { reference } = useExtensionState(SuggestionMenu, {
    selector: (state) => {
      // Measures the trigger on each update, so the menu follows layout
      // shifts that move the editor without a transaction or scroll.
      const getBoundingClientRect = () =>
        editorDOMElement
          ?.querySelector(".bn-suggestion-decorator")
          ?.getBoundingClientRect() ||
        state?.referencePos ||
        new DOMRect();
      return {
        reference: {
          // A descendant lets Floating UI observe scrolling of the editor itself.
          element: editorDOMElement?.firstElementChild ?? undefined,
          getBoundingClientRect,
        } satisfies GenericPopoverReference,
        // The trigger's position when the state changed. A transaction that
        // moves the trigger gives a new reference, so the menu re-measures.
        rect: getBoundingClientRect(),
      };
    },
    equalityFn: (a, b) =>
      // Ignore fresh rectangle/callback identities when the anchor has not moved.
      a.reference.element === b.reference.element &&
      a.rect.x === b.rect.x &&
      a.rect.y === b.rect.y &&
      a.rect.width === b.rect.width &&
      a.rect.height === b.rect.height,
  });
  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: state?.show && state.triggerCharacter === triggerCharacter,
        onOpenChange: (open) => {
          if (!open) {
            suggestionMenu.closeMenu();
          }
        },
        placement: "bottom-start",
        middleware,
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        // Prevent editor blur when clicking the scrollbar.
        onMouseDownCapture: (event) => event.preventDefault(),
        style: { zIndex },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [
      props.floatingUIOptions,
      state?.show,
      state?.triggerCharacter,
      suggestionMenu,
      triggerCharacter,
      middleware,
      zIndex,
    ],
  );

  if (
    !enabled ||
    !state ||
    (!state.ignoreQueryLength &&
      minQueryLength &&
      (state.query.startsWith(" ") || state.query.length < minQueryLength))
  ) {
    return null;
  }

  return (
    <PortalElementOverride target={props.portalElement ?? undefined}>
      <GenericPopover reference={reference} {...floatingUIOptions}>
        {props.children({
          query: state.query,
          closeMenu: suggestionMenu.closeMenu,
          clearQuery: suggestionMenu.clearQuery,
        })}
      </GenericPopover>
    </PortalElementOverride>
  );
}
