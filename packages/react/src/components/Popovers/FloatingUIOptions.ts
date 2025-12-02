import {
  UseDismissProps,
  UseFloatingOptions,
  UseHoverProps,
  UseTransitionStatusProps,
  UseTransitionStylesProps,
} from "@floating-ui/react";
import { HTMLAttributes } from "react";

export type FloatingUIOptions = {
  useFloatingOptions?: UseFloatingOptions;
  useTransitionStylesProps?: UseTransitionStylesProps;
  useTransitionStatusProps?: UseTransitionStatusProps;
  useDismissProps?: UseDismissProps;
  useHoverProps?: UseHoverProps;
  elementProps?: HTMLAttributes<HTMLDivElement>;
};
