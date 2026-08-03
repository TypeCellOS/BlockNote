import {
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { FormulaButton } from "./FormulaButton";

function CustomFormattingToolbarContent() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems()}
      <FormulaButton key="formula" />
    </FormattingToolbar>
  );
}

export function CustomFormattingToolbar() {
  return (
    <FormattingToolbarController
      formattingToolbar={CustomFormattingToolbarContent}
    />
  );
}
