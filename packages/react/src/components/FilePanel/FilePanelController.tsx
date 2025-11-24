import { FilePanelExtension as FilePanelExtension } from "@blocknote/core/extensions";
import { flip, offset } from "@floating-ui/react";
import { FC, useEffect, useMemo, useState } from "react";

import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { useExtensionState } from "../../hooks/useExtension.js";

export const FilePanelController = (props: {
  filePanel?: FC<FilePanelProps>;
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const [open, setOpen] = useState(false);

  const blockId = useExtensionState(FilePanelExtension, {
    selector: (state) => state.blockId,
  });
  useEffect(() => {
    setOpen(blockId !== undefined);
  }, [blockId]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: setOpen,
        middleware: [offset(10), flip()],
      },
      useDismissProps: {
        outsidePress: false,
      },
      elementProps: {
        style: {
          zIndex: 90,
        },
      },
      ...props.floatingUIOptions,
    }),
    [open, props.floatingUIOptions],
  );

  const Component = props.filePanel || FilePanel;

  return (
    <BlockPopover blockId={blockId} {...floatingUIOptions}>
      {blockId && <Component blockId={blockId} />}
    </BlockPopover>
  );
};
