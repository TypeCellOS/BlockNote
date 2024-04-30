import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useState } from "react";

import {
  PanelProps,
  useComponentsContext,
} from "../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { ImagePanelProps } from "./ImagePanelProps";
import { EmbedTab } from "./DefaultTabs/EmbedTab";
import { UploadTab } from "./DefaultTabs/UploadTab";

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
  props: ImagePanelProps<I, S> &
    Partial<Pick<PanelProps, "defaultOpenTab" | "tabs">>
) => {
  const components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [loading, setLoading] = useState<boolean>(false);

  const tabs: PanelProps["tabs"] = props.tabs ?? [
    ...(editor.uploadFile !== undefined
      ? [
          {
            name: "Upload",
            tabPanel: <UploadTab block={props.block} setLoading={setLoading} />,
          },
        ]
      : []),
    {
      name: "Embed",
      tabPanel: <EmbedTab block={props.block} />,
    },
  ];

  const [openTab, setOpenTab] = useState<string>(
    props.defaultOpenTab || tabs[0].name
  );

  return (
    <components.Panel
      defaultOpenTab={openTab}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
      setLoading={setLoading}
    />
  );
};
