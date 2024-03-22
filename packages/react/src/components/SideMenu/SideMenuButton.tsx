export const SideMenuButton = (props: { children: JSX.Element }) => (
  <button className="bn-sidemenu-button">
    <span className="bn-sidemenu-button-icon">{props.children}</span>
  </button>
);
