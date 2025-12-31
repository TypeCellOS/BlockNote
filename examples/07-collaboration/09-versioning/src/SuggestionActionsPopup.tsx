import { SuggestionsExtension } from "@blocknote/core/extensions";
import {
  FloatingUIOptions,
  GenericPopover,
  GenericPopoverReference,
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
} from "@blocknote/react";
import { flip, offset, safePolygon } from "@floating-ui/react";
import { useEffect, useMemo, useState } from "react";
import { RiArrowGoBackLine, RiCheckLine } from "react-icons/ri";

export const SuggestionActionsPopup = () => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const [toolbarOpen, setToolbarOpen] = useState(false);

  const {
    applySuggestion,
    getSuggestionAtCoords,
    getSuggestionAtSelection,
    getSuggestionElementAtPos,
    revertSuggestion,
  } = useExtension(SuggestionsExtension);

  const [suggestion, setSuggestion] = useState<
    | {
        cursorType: "text" | "mouse";
        range: { from: number; to: number };
        element: HTMLElement;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    const textCursorCallback = () => {
      const textCursorSuggestion = getSuggestionAtSelection();
      if (!textCursorSuggestion) {
        setSuggestion(undefined);
        setToolbarOpen(false);

        return;
      }

      setSuggestion({
        cursorType: "text",
        range: textCursorSuggestion.range,
        element: getSuggestionElementAtPos(textCursorSuggestion.range.from)!,
      });

      setToolbarOpen(true);
    };

    const mouseCursorCallback = (event: MouseEvent) => {
      if (suggestion !== undefined && suggestion.cursorType === "text") {
        return;
      }

      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const mouseCursorSuggestion = getSuggestionAtCoords({
        left: event.clientX,
        top: event.clientY,
      });
      if (!mouseCursorSuggestion) {
        return;
      }

      const element = getSuggestionElementAtPos(
        mouseCursorSuggestion.range.from,
      )!;
      if (element === suggestion?.element) {
        return;
      }

      setSuggestion({
        cursorType: "mouse",
        range: mouseCursorSuggestion.range,
        element: getSuggestionElementAtPos(mouseCursorSuggestion.range.from)!,
      });
    };

    const destroyOnChangeHandler = editor.onChange(textCursorCallback);
    const destroyOnSelectionChangeHandler =
      editor.onSelectionChange(textCursorCallback);

    editor.domElement?.addEventListener("mousemove", mouseCursorCallback);

    return () => {
      destroyOnChangeHandler();
      destroyOnSelectionChangeHandler();

      editor.domElement?.removeEventListener("mousemove", mouseCursorCallback);
    };
  }, [editor.domElement, suggestion]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: toolbarOpen,
        onOpenChange: (open, _event, reason) => {
          if (
            suggestion !== undefined &&
            suggestion.cursorType === "text" &&
            reason === "hover"
          ) {
            return;
          }

          if (reason === "escape-key") {
            editor.focus();
          }

          setToolbarOpen(open);
        },
        placement: "top-start",
        middleware: [offset(10), flip()],
      },
      useHoverProps: {
        enabled: suggestion !== undefined && suggestion.cursorType === "mouse",
        delay: {
          open: 250,
          close: 250,
        },
        handleClose: safePolygon({
          blockPointerEvents: true,
        }),
      },
      elementProps: {
        style: {
          zIndex: 50,
        },
      },
    }),
    [editor, suggestion, toolbarOpen],
  );

  const reference = useMemo<GenericPopoverReference | undefined>(
    () => (suggestion?.element ? { element: suggestion.element } : undefined),
    [suggestion?.element],
  );

  if (!editor.isEditable) {
    return null;
  }

  return (
    <GenericPopover reference={reference} {...floatingUIOptions}>
      {suggestion && (
        <Components.Generic.Toolbar.Root className={"bn-toolbar"}>
          <Components.Generic.Toolbar.Button
            label="Apply Change"
            icon={<RiCheckLine />}
            onClick={() =>
              applySuggestion(suggestion.range.from, suggestion.range.to)
            }
            mainTooltip="Apply Change"
          >
            {/* Apply Change */}
          </Components.Generic.Toolbar.Button>
          <Components.Generic.Toolbar.Button
            label="Revert Change"
            icon={<RiArrowGoBackLine />}
            onClick={() =>
              revertSuggestion(suggestion.range.from, suggestion.range.to)
            }
            mainTooltip="Revert Change"
          >
            {/* Revert Change */}
          </Components.Generic.Toolbar.Button>
        </Components.Generic.Toolbar.Root>
      )}
    </GenericPopover>
  );
};
