import { PanelFileInputProps } from "../../../react/src";
import { Input } from "../components/ui/input";

export const PanelFileInput = (props: PanelFileInputProps) => {
  return (
    <Input
      type={"file"}
      defaultValue={props.defaultValue ? props.defaultValue.name : undefined}
      value={props.value ? props.value.name : undefined}
      onChange={async (e) => props.onChange?.(e.target.files![0])}
      placeholder={props.placeholder}
    />
  );
};
