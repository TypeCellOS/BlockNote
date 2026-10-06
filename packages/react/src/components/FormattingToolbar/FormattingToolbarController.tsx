import { isTouchDevice } from "@blocknote/core";
import { FC } from "react";

import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { DesktopFormattingToolbarController } from "./DesktopFormattingToolbarController.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { MobileFormattingToolbarController } from "./MobileFormattingToolbarController.js";
import { mobileToolbarForced, useKeyboardPanel } from "./useKeyboardPanel.js";
import { useVirtualKeyboard } from "./useVirtualKeyboard.js";

export const FormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * the ambient portal element (the element wrapping the editor by default)
   * when omitted.
   */
  portalElement?: HTMLElement;
}) => {
  const keyboardOpen = useVirtualKeyboard();
  // Owned here, above the mobile/desktop switch: the panel replaces the
  // keyboard, so its state has to outlive `keyboardOpen` going false.
  const panel = useKeyboardPanel<"format" | "blocks">();

  // Checks both if the device is touch-capable and the virtual keyboard is open, as phones,
  // tablets, etc. can still use external keyboards and mice.
  if (
    mobileToolbarForced() ||
    (isTouchDevice() && (keyboardOpen || panel.panelOpen))
  ) {
    return (
      <MobileFormattingToolbarController
        formattingToolbar={props.formattingToolbar}
        panel={panel}
      />
    );
  }

  return <DesktopFormattingToolbarController {...props} />;
};
