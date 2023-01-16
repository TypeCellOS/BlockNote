export type EditorElement<ElementDynamicParams extends Record<string, any>> = {
  element: HTMLElement | undefined;
  show: (params: ElementDynamicParams) => void;
  hide: () => void;
  update: (params: ElementDynamicParams) => void;
};

export type ElementFactory<
  ElementStaticParams extends Record<string, any>,
  ElementDynamicParams extends Record<string, any>
> = (params: ElementStaticParams) => EditorElement<ElementDynamicParams>;
