import { FC } from "react";

export type TableHandleProps = {
  orientation: "row" | "column";
  hideOtherElements: (hide: boolean) => void;
  tableHandleMenu?: FC;
};
