import { PanelTextInputProps } from "../../../react/src";
import { Input } from "../components/ui/input";

export const PanelTextInput = (props: PanelTextInputProps) => {
  const { children, ...rest } = props;

  return (
    <Input {...rest} data-test={"embed-input"}>
      {children}
    </Input>
  );
};
