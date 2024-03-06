import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { LoadingOverlay, Tabs } from "@mantine/core";
import { FC, useState } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { ImageToolbarProps } from "../ImageToolbarProps";
import { UploadPanel } from "./DefaultTabPanels/UploadPanel";
import { EmbedPanel } from "./DefaultTabPanels/EmbedPanel";

export const ImageToolbar = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImageToolbarProps<I, S> & {
    tabs?: {
      tabName: string;
      tabPanel: FC<
        ImageToolbarProps<I, S> & {
          setLoading: (loading: boolean) => void;
        }
      >;
    }[];
  }
) => {
  if (props.tabs !== undefined && props.tabs.length === 0) {
    throw Error(
      "Prop `tabs` was passed to ImageToolbar component but contains no elements."
    );
  }

  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [openTab, setOpenTab] = useState<string>(
    props.tabs !== undefined
      ? props.tabs[0].tabName
      : editor.uploadFile !== undefined
      ? "upload"
      : "embed"
  );
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {loading && <LoadingOverlay visible={loading} />}

        <Tabs.List>
          {props.tabs !== undefined ? (
            props.tabs.map(({ tabName }) => (
              <Tabs.Tab value={tabName}>{tabName}</Tabs.Tab>
            ))
          ) : (
            <>
              {editor.uploadFile !== undefined && (
                <Tabs.Tab value="upload" data-test={"upload-tab"}>
                  Upload
                </Tabs.Tab>
              )}
              <Tabs.Tab value="embed" data-test={"embed-tab"}>
                Embed
              </Tabs.Tab>
            </>
          )}
        </Tabs.List>

        {props.tabs !== undefined ? (
          props.tabs.map(({ tabName, tabPanel }) => {
            const TabPanel = tabPanel;
            return (
              <Tabs.Panel value={tabName}>
                <TabPanel block={props.block} setLoading={setLoading} />
              </Tabs.Panel>
            );
          })
        ) : (
          <>
            <Tabs.Panel className={"bn-upload-image-panel"} value="upload">
              <UploadPanel block={props.block} setLoading={setLoading} />
            </Tabs.Panel>
            <Tabs.Panel className={"bn-embed-image-panel"} value="embed">
              <EmbedPanel block={props.block} />
            </Tabs.Panel>
          </>
        )}
      </Tabs>
    </Toolbar>
  );
};
