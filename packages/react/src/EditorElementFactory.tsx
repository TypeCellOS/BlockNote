import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "./BlockNoteTheme";
import Tippy, { TippyProps } from "@tippyjs/react";
import { createRoot } from "react-dom/client";
import { EditorElement, RequiredDynamicParams } from "@blocknote/core";

export const ReactEditorElementFactory = <
  ElementStaticParams extends Record<string, any>,
  ElementDynamicParams extends RequiredDynamicParams
>(
  staticParams: ElementStaticParams,
  EditorElementComponent: (
    props: ElementStaticParams & ElementDynamicParams
  ) => JSX.Element,
  tippyProps?: TippyProps
): EditorElement<ElementDynamicParams> => {
  let setElementDynamicParams: (dynamicParams: ElementDynamicParams) => void;
  let setElementIsOpen: (isOpen: boolean) => void;

  const EditorElementController = () => {
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
          appendTo={document.body}
          content={
            dynamicParams ? (
              <EditorElementComponent {...staticParams} {...dynamicParams} />
            ) : undefined
          }
          getReferenceClientRect={
            dynamicParams ? () => dynamicParams!.referenceRect : undefined
          }
          interactive={true}
          visible={isOpen}
        />
      </MantineProvider>
    );
  };

  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);

  root.render(<EditorElementController />);

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
