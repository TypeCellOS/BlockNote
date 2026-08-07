import { ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { getFormattingToolbarItems } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

/**
 * A formatting toolbar tailored for mobile — where it sits just above the
 * on-screen keyboard (see `MobileFormattingToolbarController`).
 *
 * For now it renders the same items as the regular `FormattingToolbar` — their
 * dropdowns/popovers open above the keyboard automatically via floating-ui's
 * `flip` middleware. Over time this can diverge from the desktop toolbar with
 * mobile-specific items/behavior.
 */
export const MobileFormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root
      className={"bn-toolbar bn-formatting-toolbar"}
    >
      {props.children || getFormattingToolbarItems(props.blockTypeSelectItems)}
    </Components.FormattingToolbar.Root>
  );
};
