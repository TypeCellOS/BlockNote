import {
  ElementProps,
  UseFloatingReturn,
  UseInteractionsReturn,
} from "@floating-ui/react";

export type FloatingUIReturns = {
  useFloatingReturn: UseFloatingReturn;
  isMounted: boolean;
  styles: React.CSSProperties;
  status: "unmounted" | "initial" | "open" | "close";
  dismiss?: ElementProps;
  hover?: ElementProps;
  useInteractionsReturn: UseInteractionsReturn;
};
