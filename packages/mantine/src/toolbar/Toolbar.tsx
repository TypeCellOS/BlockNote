import { Flex } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { mergeRefs, useFocusTrap, useFocusWithin } from "@mantine/hooks";
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["Generic"]["Toolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const {
      className,
      children,
      onMouseEnter,
      onMouseLeave,
      variant,
      ...rest
    } = props;

    assertEmpty(rest);

    // use a focus trap so that tab cycles through toolbar buttons, but only if focus is within the toolbar
    const { ref: focusRef, focused } = useFocusWithin();

    const trapRef = useFocusTrap(focused);

    const combinedRef = mergeRefs(ref, focusRef, trapRef);

    return (
      <Flex
        className={className}
        ref={combinedRef}
        role="toolbar"
        // TODO: aria-label
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        gap={variant === "action-toolbar" ? 2 : undefined}
      >
        {children}
      </Flex>
    );
  },
);
