import { FilePanelExtension } from "@blocknote/core/extensions";
import { flip, offset } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { BlockPopover } from "../Popovers/BlockPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";

export const FilePanelController = (props: {
  filePanel?: FC<FilePanelProps>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` (which by default is mounted inside `bn-container`)
   * when omitted.
   */
  portalElement?: HTMLElement | null;
}) => {
  const editor = useBlockNoteEditor<any, any, any>();

  const filePanel = useExtension(FilePanelExtension);
  const blockId = useExtensionState(FilePanelExtension);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
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
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        style: {
          zIndex: 90,
        },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [blockId, editor, filePanel, props.floatingUIOptions],
  );

  const Component = props.filePanel || FilePanel;

  return (
    <BlockPopover
      blockId={blockId}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      {blockId && <Component blockId={blockId} />}
    </BlockPopover>
  );
};
