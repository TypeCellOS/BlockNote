import { Range } from "@tiptap/core";
import { ReactNode } from "react";

export type LinkToolbarProps = {
  url: string;
  text: string;
  range: Range;
  setToolbarOpen?: (open: boolean) => void;
  setToolbarPositionFrozen?: (frozen: boolean) => void;
  children?: ReactNode;
};
