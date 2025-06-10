import {
  BlockSchema,
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
} from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { EmbedTab } from "./DefaultTabs/EmbedTab.js";
import { UploadTab } from "./DefaultTabs/UploadTab.js";
import { FilePanelProps } from "./FilePanelProps.js";

type PanelProps = ComponentProps["FilePanel"]["Root"];

/**
 * By default, the FilePanel component will render with default tabs. However,
 * you can override the tabs to render by passing the `tabs` prop. You can use
 * the default tab panels in the `DefaultTabPanels` directory or make your own
 * using the `FilePanelPanel` component.
 */
export const FilePanel = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: FilePanelProps<I, S> &
    Partial<Pick<PanelProps, "defaultOpenTab" | "tabs">>,
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<B, I, S>();

  const [loading, setLoading] = useState<boolean>(false);

  const tabs: PanelProps["tabs"] = props.tabs ?? [
    ...(editor.uploadFile !== undefined
      ? [
          {
            name: dict.file_panel.upload.title,
            tabPanel: <UploadTab block={props.block} setLoading={setLoading} />,
          },
        ]
      : []),
    {
      name: dict.file_panel.embed.title,
      tabPanel: <EmbedTab block={props.block} />,
    },
  ];

  const [openTab, setOpenTab] = useState<string>(
    props.defaultOpenTab || tabs[0].name,
  );

  return (
    <Components.FilePanel.Root
      className={"bn-panel"}
      defaultOpenTab={openTab}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
};
