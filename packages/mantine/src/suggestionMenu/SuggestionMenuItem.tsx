import {
  Badge as MantineBadge,
  Group as MantineGroup,
  Stack as MantineStack,
  Text as MantineText,
} from "@mantine/core";
import { mergeRefs } from "@mantine/hooks";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, elementOverflow } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const { className, isSelected, onClick, item, id, ...rest } = props;

  assertEmpty(rest);

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current || !isSelected) {
      return;
    }

    const overflow = elementOverflow(
      itemRef.current,
      document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")!, // TODO
    );

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  return (
    <MantineGroup
      gap={0}
      className={className}
      ref={mergeRefs(ref, itemRef)}
      id={id}
      role="option"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-selected={isSelected || undefined}
    >
      {item.icon && (
        <MantineGroup
          className="bn-mt-suggestion-menu-item-section"
          data-position="left"
        >
          {item.icon}
        </MantineGroup>
      )}
      <MantineStack gap={0} className="bn-mt-suggestion-menu-item-body">
        <MantineText className="bn-mt-suggestion-menu-item-title">
          {item.title}
        </MantineText>
        <MantineText className="bn-mt-suggestion-menu-item-subtitle">
          {item.subtext}
        </MantineText>
      </MantineStack>
      {item.badge && (
        <MantineGroup
          data-position="right"
          className="bn-mt-suggestion-menu-item-section"
        >
          <MantineBadge size={"xs"}>{item.badge}</MantineBadge>
        </MantineGroup>
      )}
    </MantineGroup>
  );
});
