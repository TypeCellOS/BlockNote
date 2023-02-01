import { MantineProvider } from "@mantine/core";
import Tippy, { TippyProps } from "@tippyjs/react";
import { RequiredDynamicParams } from "@blocknote/core";
import { BlockNoteTheme } from "../../BlockNoteTheme";

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
  dynamicParams: ElementDynamicParams | undefined;
  editorElementComponent: (
    props: ElementStaticParams & ElementDynamicParams
  ) => JSX.Element;
  tippyProps?: TippyProps;
}) {
  const EditorElementComponent = props.editorElementComponent;

  return (
    <MantineProvider theme={BlockNoteTheme}>
      <Tippy
        appendTo={props.rootElement}
        content={
          props.dynamicParams ? (
            <EditorElementComponent
              {...props.staticParams}
              {...props.dynamicParams}
            />
          ) : undefined
        }
        getReferenceClientRect={
          props.dynamicParams
            ? () => props.dynamicParams!.referenceRect
            : undefined
        }
        interactive={true}
        onShow={() => {
          document.body.appendChild(props.rootElement);
        }}
        onHidden={() => {
          props.rootElement.remove();
        }}
        visible={props.isOpen}
        {...props.tippyProps}
      />
    </MantineProvider>
  );
}
