import { JSX, ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { BasicTextStyleButton } from "./DefaultButtons/BasicTextStyleButton.js";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton.js";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton.js";
import { FileCaptionButton } from "./DefaultButtons/FileCaptionButton.js";
import { FileDeleteButton } from "./DefaultButtons/FileDeleteButton.js";
import { FileRenameButton } from "./DefaultButtons/FileRenameButton.js";
import { FileReplaceButton } from "./DefaultButtons/FileReplaceButton.js";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons.js";
import {
  BlockTypeSelect,
  BlockTypeSelectItem,
} from "./DefaultSelects/BlockTypeSelect.js";

import { AddCommentButton } from "./DefaultButtons/AddCommentButton.js";
import { AddTiptapCommentButton } from "./DefaultButtons/AddTiptapCommentButton.js";
import { FileDownloadButton } from "./DefaultButtons/FileDownloadButton.js";
import { FilePreviewButton } from "./DefaultButtons/FilePreviewButton.js";
import { TableCellMergeButton } from "./DefaultButtons/TableCellMergeButton.js";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

export const getFormattingToolbarItems = (
  blockTypeSelectItems?: BlockTypeSelectItem[],
): JSX.Element[] => [
  <BlockTypeSelect key={"blockTypeSelect"} items={blockTypeSelectItems} />,
  <TableCellMergeButton key={"tableCellMergeButton"} />,
  <FileCaptionButton key={"fileCaptionButton"} />,
  <FileReplaceButton key={"replaceFileButton"} />,
  <FileRenameButton key={"fileRenameButton"} />,
  <FileDeleteButton key={"fileDeleteButton"} />,
  <FileDownloadButton key={"fileDownloadButton"} />,
  <FilePreviewButton key={"filePreviewButton"} />,
  <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />,
  <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />,
  <BasicTextStyleButton
    basicTextStyle={"underline"}
    key={"underlineStyleButton"}
  />,
  <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />,
  <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />,
  <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />,
  <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />,
  <ColorStyleButton key={"colorStyleButton"} />,
  <NestBlockButton key={"nestBlockButton"} />,
  <UnnestBlockButton key={"unnestBlockButton"} />,
  <CreateLinkButton key={"createLinkButton"} />,
  <AddCommentButton key={"addCommentButton"} />,
  <AddTiptapCommentButton key={"addTiptapCommentButton"} />,
];

// TODO: props.blockTypeSelectItems should only be available if no children
//  are passed
/**
 * By default, the FormattingToolbar component will render with default
 * selects/buttons. However, you can override the selects/buttons to render
 * by passing children. The children you pass should be:
 *
 * - Default selects: Components found within the `/DefaultSelects` directory.
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export const FormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root
      className={"bn-toolbar bn-formatting-toolbar"}
    >
      {props.children || getFormattingToolbarItems(props.blockTypeSelectItems)}
    </Components.FormattingToolbar.Root>
  );
};
