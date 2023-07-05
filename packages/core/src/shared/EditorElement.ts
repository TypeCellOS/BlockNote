export type RequiredStaticParams = Record<string, any> & {
  getReferenceRect: () => DOMRect;
};
export type RequiredDynamicParams = Record<string, any> & {};

export type EditorElement<ElementDynamicParams extends RequiredDynamicParams> =
  {
    element: HTMLElement | undefined;
    render: (params: ElementDynamicParams, isHidden: boolean) => void;
    hide: () => void;
  };

export type ElementFactory<
  ElementStaticParams extends RequiredStaticParams,
  ElementDynamicParams extends RequiredDynamicParams
> = (staticParams: ElementStaticParams) => EditorElement<ElementDynamicParams>;
