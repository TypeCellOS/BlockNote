export type Menu<MenuParams extends Record<string, any>> = {
  element: HTMLElement | undefined;
  show: (params: MenuParams) => void;
  hide: () => void;
  update: (params: MenuParams) => void;
};

export type MenuFactory<MenuParams extends Record<string, any>> = (
  params: MenuParams
) => Menu<MenuParams>;
