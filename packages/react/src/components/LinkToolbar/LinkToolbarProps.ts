import { ReactNode } from "react";

export type LinkToolbarProps = {
  url: string;
  text: string;
  editLink: (url: string, text: string) => void;
  deleteLink: () => void;
  children?: ReactNode;
};
