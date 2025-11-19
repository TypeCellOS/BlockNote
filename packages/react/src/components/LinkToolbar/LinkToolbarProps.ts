import { Range } from "@tiptap/core";
import { ReactNode } from "react";

export type LinkToolbarProps = {
  url: string;
  text: string;
  range: Range;
  children?: ReactNode;
};
