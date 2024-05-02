import { ComponentProps } from "@blocknote/react";
import { forwardRef, useCallback } from "react";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const SuggestionMenuItem = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
  const ShadCNComponents = useShadCNComponentsContext()!;

  const {
    className,
    title,
    subtext,
    // group,
    icon,
    badge,
    // aliases,
    // onItemClick,
    isSelected,
    setSelected,
    onClick,
  } = props;

  const handleMouseLeave = useCallback(() => {
    setSelected?.(false);
  }, [setSelected]);

  const handleMouseEnter = useCallback(() => {
    setSelected?.(true);
  }, [setSelected]);

  return (
    <div
      // Styles from ShadCN DropdownMenuItem component
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      ref={ref}
      onClick={onClick}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={isSelected ? "" : undefined}>
      {icon && (
        <div className="p-3" data-position="left">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="text-base">{title}</div>
        <div className="text-xs">{subtext}</div>
      </div>
      {badge && (
        <div data-position="right" className="text-xs">
          <ShadCNComponents.Badge.Badge variant={"secondary"}>
            {badge}
          </ShadCNComponents.Badge.Badge>
        </div>
      )}
    </div>
  );
});
