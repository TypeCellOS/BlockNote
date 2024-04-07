import * as Mantine from "@mantine/core";

import { mergeCSSClasses } from "@blocknote/core";
import { mergeRefs, useFocusTrap, useFocusWithin } from "@mantine/hooks";
import { HTMLAttributes, forwardRef } from "react";

export const Toolbar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  // use a focus trap so that tab cycles through toolbar buttons, but only if focus is within the toolbar
  const { ref: focusRef, focused } = useFocusWithin();

  const trapRef = useFocusTrap(focused);

  const combinedRef = mergeRefs(ref, focusRef, trapRef);

  return (
    <Mantine.Group
      className={mergeCSSClasses("bn-toolbar", className || "")}
      ref={combinedRef}
      role="toolbar"
      // tabIndex={0}
      // TODO: aria-label
      {...rest}>
      {children}
    </Mantine.Group>
  );
});
