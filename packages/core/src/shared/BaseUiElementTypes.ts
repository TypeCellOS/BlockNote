export type BaseUiElementCallbacks = {
  destroy: () => void;
};

export type BaseUiElementState = {
  show: boolean;
  referencePos: DOMRect;
};
