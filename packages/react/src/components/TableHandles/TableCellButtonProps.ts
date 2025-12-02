import { FC } from "react";

export type TableCellButtonProps = {
  hideOtherElements: (hide: boolean) => void;
  tableCellMenu?: FC;
};
