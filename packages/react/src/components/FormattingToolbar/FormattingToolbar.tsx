import { FC, ReactNode } from "react";

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

import { FileDownloadButton } from "./DefaultButtons/FileDownloadButton.js";
import { FilePreviewButton } from "./DefaultButtons/FilePreviewButton.js";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

export const getFormattingToolbarItems = (
  blockTypeSelectItems?: BlockTypeSelectItem[]
): { itemName: string; Component: FC }[] => [
  {
    itemName: "blockTypeSelect",
    Component: () => (
      <BlockTypeSelect key={"blockTypeSelect"} items={blockTypeSelectItems} />
    ),
  },
  {
    itemName: "fileCaptionButton",
    Component: () => <FileCaptionButton key={"fileCaptionButton"} />,
  },
  {
    itemName: "replaceFileButton",
    Component: () => <FileReplaceButton key={"replaceFileButton"} />,
  },
  {
    itemName: "fileRenameButton",
    Component: () => <FileRenameButton key={"fileRenameButton"} />,
  },
  {
    itemName: "fileDeleteButton",
    Component: () => <FileDeleteButton key={"fileDeleteButton"} />,
  },
  {
    itemName: "fileDownloadButton",
    Component: () => <FileDownloadButton key={"fileDownloadButton"} />,
  },
  {
    itemName: "filePreviewButton",
    Component: () => <FilePreviewButton key={"filePreviewButton"} />,
  },
  {
    itemName: "boldStyleButton",
    Component: () => (
      <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
    ),
  },
  {
    itemName: "italicStyleButton",
    Component: () => (
      <BasicTextStyleButton
        basicTextStyle={"italic"}
        key={"italicStyleButton"}
      />
    ),
  },
  {
    itemName: "underlineStyleButton",
    Component: () => (
      <BasicTextStyleButton
        basicTextStyle={"underline"}
        key={"underlineStyleButton"}
      />
    ),
  },
  {
    itemName: "strikeStyleButton",
    Component: () => (
      <BasicTextStyleButton
        basicTextStyle={"strike"}
        key={"strikeStyleButton"}
      />
    ),
  },
  {
    itemName: "textAlignLeftButton",
    Component: () => (
      <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
    ),
  },
  {
    itemName: "textAlignCenterButton",
    Component: () => (
      <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
    ),
  },
  {
    itemName: "textAlignRightButton",
    Component: () => (
      <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />
    ),
  },
  {
    itemName: "colorStyleButton",
    Component: () => <ColorStyleButton key={"colorStyleButton"} />,
  },
  {
    itemName: "nestBlockButton",
    Component: () => <NestBlockButton key={"nestBlockButton"} />,
  },
  {
    itemName: "unnestBlockButton",
    Component: () => <UnnestBlockButton key={"unnestBlockButton"} />,
  },
  {
    itemName: "createLinkButton",
    Component: () => <CreateLinkButton key={"createLinkButton"} />,
  },
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
  props: FormattingToolbarProps & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root
      className={"bn-toolbar bn-formatting-toolbar"}>
      {props.children ||
        getFormattingToolbarItems(props.blockTypeSelectItems).map((item) => {
          const Item = item.Component;
          return <Item />;
        })}
    </Components.FormattingToolbar.Root>
  );
};
