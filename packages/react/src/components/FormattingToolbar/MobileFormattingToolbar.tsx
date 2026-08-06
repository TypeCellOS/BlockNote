import { ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { getFormattingToolbarItems } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

/**
 * A formatting toolbar tailored for mobile — where it sits just above the
 * on-screen keyboard (see `ExperimentalMobileFormattingToolbarController`).
 *
 * For now it renders the same items as the regular `FormattingToolbar`, but its
 * dropdowns/popovers open *upward* (`direction="up"`) so they appear above the
 * toolbar instead of opening downward behind the keyboard. Over time this can
 * diverge from the desktop toolbar with mobile-specific items/behavior.
 */
export const MobileFormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root
      className={"bn-toolbar bn-formatting-toolbar"}
    >
      {props.children ||
        getFormattingToolbarItems(props.blockTypeSelectItems, "up")}
    </Components.FormattingToolbar.Root>
  );
};
