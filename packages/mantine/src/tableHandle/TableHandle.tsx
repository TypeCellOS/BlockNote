import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

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
    ...rest
  } = props;

  return (
    <button
      className={className}
      ref={ref}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={style}
      {...rest}>
      {children}
    </button>
  );
});
