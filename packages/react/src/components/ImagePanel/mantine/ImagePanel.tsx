import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Group, LoadingOverlay, Tabs } from "@mantine/core";
import { ReactNode, useState } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { ImagePanelProps } from "../ImagePanelProps";
import { UploadTab } from "./DefaultTabs/UploadTab";
import { EmbedTab } from "./DefaultTabs/EmbedTab";

/**
 * By default, the ImageToolbar component will render with default tabs.
 * However, you can override the tabs to render by passing the `tabs` prop. You
 * can use the default tab panels in the `DefaultTabPanels` directory or make
 * your own using the `ImageToolbarPanel` component.
 */
export const ImagePanel = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImagePanelProps<I, S> & {
    children?: ReactNode;
  }
) => {
  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [openTab, setOpenTab] = useState<string>("default");
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <Group className={"bn-image-panel"}>
      {props.children !== undefined ? (
        props.children
      ) : (
        <Tabs value={openTab} onChange={setOpenTab as any}>
          {loading && <LoadingOverlay visible={loading} />}

          <Tabs.List>
            {editor.uploadFile !== undefined && (
              <Tabs.Tab value={"default"} data-test={"upload-tab"}>
                Upload
              </Tabs.Tab>
            )}
            <Tabs.Tab
              value={editor.uploadFile === undefined ? "default" : "embed"}
              data-test={"embed-tab"}>
              Embed
            </Tabs.Tab>
          </Tabs.List>

          {editor.uploadFile !== undefined && (
            <Tabs.Panel className={"bn-upload-image-panel"} value="default">
              <UploadTab block={props.block} setLoading={setLoading} />
            </Tabs.Panel>
          )}
          <Tabs.Panel
            className={"bn-embed-image-panel"}
            value={editor.uploadFile === undefined ? "default" : "embed"}>
            <EmbedTab block={props.block} />
          </Tabs.Panel>
        </Tabs>
      )}
    </Group>
  );
};
