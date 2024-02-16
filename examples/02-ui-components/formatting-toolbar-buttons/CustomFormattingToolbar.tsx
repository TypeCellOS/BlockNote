import {
  BasicTextStyleButton,
  getFormattingToolbarItems,
  ToolbarWrapper,
} from "@blocknote/react";

import { CustomButton } from "./CustomButton";

export function CustomFormattingToolbar() {
  return (
    <ToolbarWrapper>
      {getFormattingToolbarItems()
        .splice(1, 0, <CustomButton key={"customButton"} />)
        .splice(
          8,
          0,
          <BasicTextStyleButton
            key={"codeStyleButton"}
            basicTextStyle={"code"}
          />
        )}
    </ToolbarWrapper>
  );
}
