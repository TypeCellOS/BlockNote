import * as Ariakit from "@ariakit/react";

import { PanelFileInputProps } from "@blocknote/react";

export const PanelFileInput = (props: PanelFileInputProps) => (
  <Ariakit.FormProvider>
    <Ariakit.FormInput
      name={"panel-input"}
      type={"file"}
      defaultValue={props.defaultValue ? props.defaultValue.name : undefined}
      value={props.value ? props.value.name : undefined}
      onChange={async (e) => props.onChange?.(e.target.files![0])}
      placeholder={props.placeholder}
    />
  </Ariakit.FormProvider>
);
