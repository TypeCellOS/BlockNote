import { MantineProvider } from "@mantine/core";
import Tippy, { TippyProps } from "@tippyjs/react";
import { RequiredDynamicParams, BlockNoteEditor } from "@blocknote/core";
import { BlockNoteTheme } from "../../BlockNoteTheme";
import { useCallback, useEffect, useState } from "react";

/**
 * Component used in the ReactElementFactory to wrap the EditorElementComponent in a MantineProvider and Tippy
 * component. The MantineProvider is used to add theming while the Tippy component is used to control show/hide
 * behavior.
 *
 * @param props The component props. Includes the same props as ReactElementFactory, as well as the current set of
 * EditorDynamicParams. Also provides props to determine if the element should be open and which element it should be
 * mounted under.
 */
export function EditorElementComponentWrapper<
  ElementStaticParams extends Record<string, any>,
  ElementDynamicParams extends RequiredDynamicParams
>(props: {
  rootElement: HTMLElement;
  isOpen: boolean;
  staticParams: ElementStaticParams;
  dynamicParams: ElementDynamicParams;
  editorElementComponent: (
    props: ElementStaticParams & ElementDynamicParams
  ) => JSX.Element;
  tippyProps?: TippyProps;
  editorRef?: React.MutableRefObject<BlockNoteEditor | null>;
}) {
  const EditorElementComponent = props.editorElementComponent;

  const [contentCleared, setContentCleared] = useState(false);

  const getReferenceClientRect = useCallback(
    () => props.dynamicParams!.referenceRect,
    [props.dynamicParams]
  );

  const onShow = useCallback(() => {
    setContentCleared(false);
    document.body.appendChild(props.rootElement);
  }, [props.rootElement]);

  const onHidden = useCallback(() => {
    props.rootElement.remove();
    setContentCleared(true);
  }, [props.rootElement]);

  useEffect(() => {
    const outerClickEvent = (ev: MouseEvent) => {
      if (
        props.editorRef?.current &&
        !props.editorRef?.current.tiptapEditor.view.dom.contains(
          ev.target as HTMLElement
        )
      ) {
        onHidden();
      }
    };

    window.addEventListener("click", outerClickEvent);

    return () => {
      window.removeEventListener("click", outerClickEvent);
      onHidden();
    };
  }, [onHidden, props.editorRef]);

  return (
    <MantineProvider theme={BlockNoteTheme}>
      <Tippy
        appendTo={props.rootElement}
        content={
          !contentCleared ? (
            <EditorElementComponent
              {...props.staticParams}
              {...props.dynamicParams}
            />
          ) : undefined
        }
        getReferenceClientRect={
          !contentCleared ? getReferenceClientRect : undefined
        }
        interactive={true}
        onShow={onShow}
        onHidden={onHidden}
        visible={props.isOpen}
        {...props.tippyProps}
      />
    </MantineProvider>
  );
}
