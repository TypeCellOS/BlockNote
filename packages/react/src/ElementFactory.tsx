import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "./BlockNoteTheme";
import Tippy, { TippyProps } from "@tippyjs/react";
import { createRoot } from "react-dom/client";
import { EditorElement, RequiredDynamicParams } from "@blocknote/core";

export const ElementFactory = <
  ElementStaticParams extends Record<string, any>,
  ElementDynamicParams extends RequiredDynamicParams
>(
  staticParams: ElementStaticParams,
  EditorElementComponent: (
    props: ElementStaticParams & ElementDynamicParams
  ) => JSX.Element,
  tippyProps?: TippyProps
): EditorElement<ElementDynamicParams> => {
  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);

  let setElementDynamicParams: (dynamicParams: ElementDynamicParams) => void;
  let setElementIsOpen: (isOpen: boolean) => void;

  const EditorElementComponentWrapper = () => {
    const [dynamicParams, setDynamicParams] = useState<
      ElementDynamicParams | undefined
    >(undefined);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    // Slight hack which allows the component state to be updated externally.
    setElementDynamicParams = setDynamicParams as any;
    setElementIsOpen = setIsOpen as any;

    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          {...tippyProps}
          appendTo={rootElement}
          content={
            dynamicParams ? (
              <EditorElementComponent {...staticParams} {...dynamicParams} />
            ) : undefined
          }
          getReferenceClientRect={
            dynamicParams ? () => dynamicParams!.referenceRect : undefined
          }
          interactive={true}
          // Tippy needs to be inside it's parent div so that it handles mouse events before the elements under it.
          // Appending it directly to the document body causes click, mousedown, etc. events to go through it.
          // TODO: Should rootElement just be added to the DOM once and stay there instead?
          onShow={() => {
            document.body.appendChild(rootElement);
          }}
          onHidden={() => {
            rootElement.remove();
          }}
          visible={isOpen}
        />
      </MantineProvider>
    );
  };

  root.render(<EditorElementComponentWrapper />);

  return {
    element: rootElement,
    render: (dynamicParams: ElementDynamicParams, isHidden: boolean) => {
      if (isHidden) {
        setElementIsOpen(true);
      }
      setElementDynamicParams(dynamicParams);
    },
    hide: () => {
      setElementIsOpen(false);
    },
  };
};
