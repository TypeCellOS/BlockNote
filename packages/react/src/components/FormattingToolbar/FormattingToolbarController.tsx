import { isTouchDevice } from "@blocknote/core";
import { FC } from "react";

import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { DesktopFormattingToolbarController } from "./DesktopFormattingToolbarController.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
import { MobileFormattingToolbarController } from "./MobileFormattingToolbarController.js";

export const FormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` (which by default is mounted inside `bn-container`)
   * when omitted.
   */
  portalElement?: HTMLElement | null;
}) => {
  if (isTouchDevice()) {
    return (
      <MobileFormattingToolbarController
        formattingToolbar={props.formattingToolbar}
      />
    );
  }

  return <DesktopFormattingToolbarController {...props} />;
};
