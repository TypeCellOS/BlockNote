import { MantineProvider, MantineThemeOverride } from "@mantine/core";
import Tippy, { TippyProps } from "@tippyjs/react";
import { RequiredDynamicParams } from "@blocknote/core";
import { FC, useCallback, useState } from "react";

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
  editorElementComponent: FC<ElementStaticParams & ElementDynamicParams>;
  theme: MantineThemeOverride;
  tippyProps?: TippyProps;
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

  return (
    <MantineProvider theme={props.theme}>
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
