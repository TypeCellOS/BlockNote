import { ComponentPropsWithoutRef, forwardRef } from "react";

export const ImageToolbarPanel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <div
      className={`bn-image-toolbar-panel${
        className ? " " + props.className : ""
      }`}
      {...rest}
      ref={ref}>
      {children}
    </div>
  );
});
