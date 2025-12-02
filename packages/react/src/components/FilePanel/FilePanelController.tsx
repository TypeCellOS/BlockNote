import { FilePanelExtension } from "@blocknote/core/extensions";
import { flip, offset } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";

export const FilePanelController = (props: {
  filePanel?: FC<FilePanelProps>;
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const editor = useBlockNoteEditor<any, any, any>();

  const filePanel = useExtension(FilePanelExtension);
  const blockId = useExtensionState(FilePanelExtension);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: !!blockId,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open, _event, reason) => {
          if (!open) {
            filePanel.closeMenu();
          }

          if (reason === "escape-key") {
            editor.focus();
          }
        },
        middleware: [offset(10), flip()],
      },
      elementProps: {
        style: {
          zIndex: 90,
        },
      },
      ...props.floatingUIOptions,
    }),
    [blockId, editor, filePanel, props.floatingUIOptions],
  );

  const Component = props.filePanel || FilePanel;

  return (
    <BlockPopover blockId={blockId} {...floatingUIOptions}>
      {blockId && <Component blockId={blockId} />}
    </BlockPopover>
  );
};
