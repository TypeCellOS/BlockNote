import { FilePanelPlugin } from "@blocknote/core";
import { UseFloatingOptions, flip, offset } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { usePluginState } from "../../hooks/usePlugin.js";

export const FilePanelController = (props: {
  filePanel?: FC<FilePanelProps>;
  floatingUIOptions?: UseFloatingOptions;
}) => {
  const blockId = usePluginState(FilePanelPlugin, {
    selector: (state) => state.blockId,
  });

  const floatingUIOptions = useMemo<UseFloatingOptions>(
    () => ({
      open: blockId !== undefined,
      middleware: [offset(10), flip()],
      ...props.floatingUIOptions,
    }),
    [blockId, props.floatingUIOptions],
  );

  const Component = props.filePanel || FilePanel;

  return (
    <BlockPopover blockId={blockId} floatingUIOptions={floatingUIOptions}>
      {blockId && <Component blockId={blockId} />}
    </BlockPopover>
  );
};
