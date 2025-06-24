import {
  BlockSchema,
  DefaultProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset, shift } from "@floating-ui/react";
import { isEventTargetWithin } from "@floating-ui/react/utils";
import { FC, useMemo, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorContentOrSelectionChange } from "../../hooks/useEditorContentOrSelectionChange.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { mergeRefs } from "../../util/mergeRefs.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

const textAlignmentToPlacement = (
  textAlignment: DefaultProps["textAlignment"],
) => {
  switch (textAlignment) {
    case "left":
      return "top-start";
    case "center":
      return "top";
    case "right":
      return "top-end";
    default:
      return "top-start";
  }
};

export const FormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    () => {
      const block = editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      return textAlignmentToPlacement(
        block.props.textAlignment as DefaultProps["textAlignment"],
      );
    },
  );

  useEditorContentOrSelectionChange(() => {
    const block = editor.getTextCursorPosition().block;

    if (!("textAlignment" in block.props)) {
      setPlacement("top-start");
    } else {
      setPlacement(
        textAlignmentToPlacement(
          block.props.textAlignment as DefaultProps["textAlignment"],
        ),
      );
    }
  }, editor);

  const state = useUIPluginState(
    editor.formattingToolbar.onUpdate.bind(editor.formattingToolbar),
  );

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    3000,
    {
      placement,
      middleware: [offset(10), shift(), flip()],
      onOpenChange: (open, _event) => {
        // console.log("change", event);
        if (!open) {
          editor.formattingToolbar.closeMenu();
          editor.focus();
        }
      },
      canDismiss: {
        enabled: true,
        escapeKey: true,
        outsidePress: (e) => {
          const view = editor._tiptapEditor?.view;
          if (!view) {
            return false;
          }

          const target = e.target;
          if (!target) {
            return false;
          }

          return !isEventTargetWithin(e, view.dom.parentElement);
        },
      },
      ...props.floatingOptions,
    },
  );

  const combinedRef = useMemo(() => mergeRefs([divRef, ref]), [divRef, ref]);

  if (!isMounted || !state) {
    return null;
  }

  if (!state.show && divRef.current) {
    // The component is fading out. Use the previous state to render the toolbar with innerHTML,
    // because otherwise the toolbar will quickly flickr (i.e.: show a different state) while fading out,
    // which looks weird
    return (
      <div
        ref={combinedRef}
        style={style}
        dangerouslySetInnerHTML={{ __html: divRef.current.innerHTML }}
      ></div>
    );
  }

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <div ref={combinedRef} style={style} {...getFloatingProps()}>
      <Component />
    </div>
  );
};
