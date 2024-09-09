import { FC } from "react";
import {
  FormattingToolbarController as FormattingToolbarControllerCore,
  FormattingToolbarProps,
} from "@blocknote/react";
import { FormattingToolbar } from "./FormattingToolbar";

export const FormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
}) => {
  return (
    <FormattingToolbarControllerCore
      formattingToolbar={props.formattingToolbar || FormattingToolbar}
    />
  );
};
