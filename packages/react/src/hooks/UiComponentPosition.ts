import { CSSProperties } from "react";

export type UiComponentPosition = {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: CSSProperties;
};
