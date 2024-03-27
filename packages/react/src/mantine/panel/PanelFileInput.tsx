import { FileInput } from "@mantine/core";

import { PanelFileInputProps } from "../../editor/ComponentsContext";

export const PanelFileInput = (props: PanelFileInputProps) => {
  const { children, ...rest } = props;

  return (
    <FileInput size={"xs"} {...rest}>
      {children}
    </FileInput>
  );
};
