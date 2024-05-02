import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useState } from "react";

import {
  ComponentProps,
  useComponentsContext,
} from "../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../i18n/dictionary";
import { EmbedTab } from "./DefaultTabs/EmbedTab";
import { UploadTab } from "./DefaultTabs/UploadTab";
import { ImagePanelProps } from "./ImagePanelProps";

type PanelProps = ComponentProps["ImagePanel"]["Root"];

/**
 * By default, the ImagePanel component will render with default tabs.
 * However, you can override the tabs to render by passing the `tabs` prop. You
 * can use the default tab panels in the `DefaultTabPanels` directory or make
 * your own using the `ImagePanelPanel` component.
 */
export const ImagePanel = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImagePanelProps<I, S> &
    Partial<Pick<PanelProps, "defaultOpenTab" | "tabs">>
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

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
            name: dict.image_panel.upload.title,
            tabPanel: <UploadTab block={props.block} setLoading={setLoading} />,
          },
        ]
      : []),
    {
      name: dict.image_panel.embed.title,
      tabPanel: <EmbedTab block={props.block} />,
    },
  ];

  const [openTab, setOpenTab] = useState<string>(
    props.defaultOpenTab || tabs[0].name
  );

  return (
    <Components.ImagePanel.Root
      className={"bn-panel"}
      defaultOpenTab={openTab}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
};
