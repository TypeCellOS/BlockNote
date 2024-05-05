import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const TableHandle = forwardRef<
  HTMLButtonElement,
  ComponentProps["TableHandle"]["Root"]
>((props, ref) => {
  const {
    className,
    children,
    draggable,
    onDragStart,
    onDragEnd,
    style,
    label,
    ...rest
  } = props;

  // false, because rest props can be added by shadcn when button is used as a trigger
  // assertEmpty in this case is only used at typescript level, not runtime level
  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Button.Button
      variant={"ghost"}
      className={cn(className, "p-0 h-fit w-fit text-gray-400")}
      ref={ref}
      aria-label={label}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={style}
      {...rest}>
      {children}
    </ShadCNComponents.Button.Button>
  );
});
