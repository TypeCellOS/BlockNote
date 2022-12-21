export type Menu<MenuUpdateProps> = {
  element: HTMLElement | undefined;
  show: (props: MenuUpdateProps) => void;
  hide: () => void;
  update: (newProps: MenuUpdateProps) => void;
};

export type MenuFactory<MenuInitProps, MenuUpdateProps> = (
  initProps: MenuInitProps
) => Menu<MenuUpdateProps>;
