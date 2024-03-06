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
import { UploadPanel } from "./DefaultPanels/UploadPanel";
import { URLPanel } from "./DefaultPanels/URLPanel";

export const ImageToolbar = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImageToolbarProps<I, S> & {
    tabs?: {
      tab: FC<ImageToolbarProps<I, S>>;
      panel: FC<
        ImageToolbarProps<I, S> & {
          setLoading: (loading: boolean) => void;
        }
      >;
    }[];
  }
) => {
  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [openTab, setOpenTab] = useState<"upload" | "embed">(
    editor.uploadFile !== undefined ? "upload" : "embed"
  );
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {loading && <LoadingOverlay visible={loading} />}

        <Tabs.List>
          {props.tabs?.map(({ tab, panel }, index) => {
            const Tab = tab;
            return <Tabs.Tab value={index.toString()}><Tab block={}</Tabs.Tab>;
          })}
        </Tabs.List>

        <UploadPanel block={props.block} setLoading={setLoading} />
        <URLPanel block={props.block} />
      </Tabs>
    </Toolbar>
  );

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {loading && <LoadingOverlay visible={loading} />}

        <Tabs.List>
          {editor.uploadFile !== undefined && (
            <Tabs.Tab value="upload" data-test={"upload-tab"}>
              Upload
            </Tabs.Tab>
          )}
          <Tabs.Tab value="embed" data-test={"embed-tab"}>
            Embed
          </Tabs.Tab>
        </Tabs.List>

        <UploadPanel block={props.block} setLoading={setLoading} />
        <URLPanel block={props.block} />
      </Tabs>
    </Toolbar>
  );
};
