export type EditorElement<ElementDynamicParams extends Record<string, any>> = {
  element: HTMLElement | undefined;
  render: (params: ElementDynamicParams, isHidden: boolean) => void;
  hide: () => void;
};

export type ElementFactory<
  ElementStaticParams extends Record<string, any>,
  ElementDynamicParams extends Record<string, any>
> = (staticParams: ElementStaticParams) => EditorElement<ElementDynamicParams>;
