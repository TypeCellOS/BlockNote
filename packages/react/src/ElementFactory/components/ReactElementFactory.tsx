import { FC } from "react";
import { TippyProps } from "@tippyjs/react";
import { createRoot } from "react-dom/client";
import {
  EditorElement,
  RequiredDynamicParams,
  RequiredStaticParams,
} from "@blocknote/core";
import { EditorElementComponentWrapper } from "./EditorElementComponentWrapper";
import { MantineThemeOverride } from "@mantine/core";

/**
 * The ReactElementFactory is a generic function used to create all other ElementFactories, which are then used in the
 * BlockNote editor. The type of ElementFactory created depends on the provided ElementStaticParams and
 * ElementDynamicParams, which determine what static/dynamic properties are used in rendering the element.
 * ElementStaticParams are initialized when the editor mounts and do not change, while ElementDynamicParams change based
 * on the editor state.
 *
 * @param staticParams Properties used in rendering the element which do not change, regardless of editor state.
 * @param EditorElementComponent The element to render, which is a React component. Takes EditorStaticParams and
 * EditorDynamicParams as props.
 * @param theme The Mantine theme used to style the element.
 * @param tippyProps Tippy props, which affect the elements' popup behaviour, e.g. popup position, animation, etc.
 */
export const ReactElementFactory = <
  ElementStaticParams extends RequiredStaticParams,
  ElementDynamicParams extends RequiredDynamicParams
>(
  staticParams: ElementStaticParams,
  EditorElementComponent: FC<ElementStaticParams & ElementDynamicParams>,
  theme: MantineThemeOverride,
  tippyProps?: TippyProps
): EditorElement<ElementDynamicParams> => {
  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);

  // Used when hiding the element. If we were to pass in undefined instead, the
  // element would be immediately cleared, not leaving time for the fade out
  // animation to complete.
  let prevDynamicParams: ElementDynamicParams | undefined = undefined;
  let isOpen = false;

  return {
    element: rootElement,
    render: (dynamicParams: ElementDynamicParams, _isHidden: boolean) => {
      // Tippy should handle the reference bounding box changing positions
      // itself, otherwise it's less responsive and isn't able to handle
      // page overflows. Therefore, we want to avoid re-rendering the element
      // when only its position changes.
      const nextDynamicParamsCopy = { ...dynamicParams };
      delete nextDynamicParamsCopy.referenceRect;
      const prevDynamicParamsCopy = { ...prevDynamicParams };
      delete prevDynamicParamsCopy.referenceRect;

      prevDynamicParams = dynamicParams;

      if (
        isOpen &&
        JSON.stringify(nextDynamicParamsCopy) ===
          JSON.stringify(prevDynamicParamsCopy)
      ) {
        return;
      }

      isOpen = true;
      root.render(
        <EditorElementComponentWrapper
          rootElement={rootElement}
          isOpen={true}
          staticParams={staticParams}
          dynamicParams={dynamicParams}
          editorElementComponent={EditorElementComponent}
          theme={theme}
          tippyProps={tippyProps}
        />
      );
    },
    hide: () => {
      isOpen = false;
      root.render(
        <EditorElementComponentWrapper
          rootElement={rootElement}
          isOpen={false}
          staticParams={staticParams}
          dynamicParams={prevDynamicParams!}
          editorElementComponent={EditorElementComponent}
          theme={theme}
          tippyProps={tippyProps}
        />
      );

      prevDynamicParams = undefined;
    },
  };
};
