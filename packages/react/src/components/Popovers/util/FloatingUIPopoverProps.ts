import { UseFloatingOptions } from "@floating-ui/react";
import { HTMLAttributes, ReactNode } from "react";

export type FloatingUIPopoverProps = {
  floatingUIOptions?: UseFloatingOptions;
  elementProps?: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
};
