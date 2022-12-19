export type Menu<MenuProps> = {
  element: HTMLElement | undefined;
  show: (props: MenuProps) => void;
  hide: () => void;
  update: (newProps: MenuProps) => void;
};

export type MenuFactory<MenuProps> = (props: MenuProps) => Menu<MenuProps>;
