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

  // Used when hiding the element. Without being passed a set of dynamic params,
  // certain menus/toolbars will not render correctly.
  let prevDynamicParams: ElementDynamicParams | undefined = undefined;

  return {
    element: rootElement,
    render: (dynamicParams: ElementDynamicParams, _isHidden: boolean) => {
      prevDynamicParams = dynamicParams;

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
