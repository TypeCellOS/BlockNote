import { FileInput } from "@mantine/core";

import { PanelFileInputProps } from "../../editor/ComponentsContext";

export const PanelFileInput = (props: PanelFileInputProps) => (
  <FileInput size={"xs"} {...props} />
);
