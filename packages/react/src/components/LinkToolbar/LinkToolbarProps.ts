import { Range } from "@tiptap/core";
import { ReactNode } from "react";

export type LinkToolbarProps = {
  url: string;
  text: string;
  range: Range;
  setToolbarFrozen?: (frozen: boolean) => void;
  setToolbarOpen?: (open: boolean) => void;
  children?: ReactNode;
};
