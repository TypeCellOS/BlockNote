export type EditorElement<ElementParams extends Record<string, any>> = {
  element: HTMLElement | undefined;
  show: (params: ElementParams) => void;
  hide: () => void;
  update: (params: ElementParams) => void;
};

export type ElementFactory<ElementParams extends Record<string, any>> = (
  params: ElementParams
) => EditorElement<ElementParams>;
