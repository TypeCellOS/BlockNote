import { BlockSchema } from "@blocknote/core";

import { ImageToolbarProps } from "./ImageToolbarPositioner";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { useMemo, useState } from "react";
import { UploadImageInput } from "./Inputs/UploadImageInput";
import { Stack } from "@mantine/core";
import { ImageURLInput } from "./Inputs/ImageURLInput";

export const DefaultImageToolbar = <BSchema extends BlockSchema>(
  props: ImageToolbarProps<BSchema>
) => {
  const [openTab, setOpenTab] = useState<"upload" | "embed">("upload");

  const Input = useMemo(
    () => () => {
      switch (openTab) {
        case "upload":
          return <UploadImageInput {...props} />;
        case "embed":
          return <ImageURLInput {...props} />;
        default:
          return null;
      }
    },
    [openTab, props]
  );

  return (
    <Toolbar>
      <Stack spacing={"xs"} m={2}>
        <Toolbar>
          <ToolbarButton
            mainTooltip={"Upload From File"}
            isSelected={openTab === "upload"}
            onClick={() => setOpenTab("upload")}>
            Upload
          </ToolbarButton>
          <ToolbarButton
            mainTooltip={"Embed From URL"}
            isSelected={openTab === "embed"}
            onClick={() => setOpenTab("embed")}>
            Embed
          </ToolbarButton>
        </Toolbar>
        <Input />
      </Stack>
    </Toolbar>
  );
};
