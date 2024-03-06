import { Tabs } from "@mantine/core";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";

export const UploadTab = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  return (
    editor.uploadFile !== undefined && (
      <Tabs.Tab value="upload" data-test={"upload-tab"}>
        Upload
      </Tabs.Tab>
    )
  );
};
