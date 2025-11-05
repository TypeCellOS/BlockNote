import { FilePanelPlugin } from "@blocknote/core";
import { UseFloatingOptions, flip, offset } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { usePlugin, usePluginState } from "../../hooks/usePlugin.js";

export const FilePanelController = (props: {
  filePanel?: FC<FilePanelProps>;
  floatingUIOptions?: UseFloatingOptions;
}) => {
  const filePanel = usePlugin(FilePanelPlugin);
  const state = usePluginState(FilePanelPlugin, {
    selector: (state) => {
      return {
        blockId: state.blockId || filePanel.store.prevState.blockId,
        show: state.blockId !== undefined,
      };
    },
  });

  const getBlockId = useCallback(() => state.blockId, [state.blockId]);

  const floatingUIOptions = useMemo<UseFloatingOptions>(
    () => ({
      open: state.show,
      middleware: [offset(10), flip()],
      ...props.floatingUIOptions,
    }),
    [props.floatingUIOptions, state.show],
  );

  const Component = props.filePanel || FilePanel;

  return (
    <BlockPopover getBlockId={getBlockId} floatingUIOptions={floatingUIOptions}>
      {state.blockId && <Component blockId={state.blockId} />}
    </BlockPopover>
  );
};
