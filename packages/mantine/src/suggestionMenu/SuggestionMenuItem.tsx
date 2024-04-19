import { useCallback, useRef } from "react";
// import type { SuggestionMenuItemProps } from "../../../react/src/editor/ComponentsContext";

export function SuggestionMenuItem(props: any) {
  const { setSelected } = props;

  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseLeave = useCallback(() => {
    setSelected?.(false);
  }, [setSelected]);

  const handleMouseEnter = useCallback(() => {
    setSelected?.(true);
  }, [setSelected]);

  // TODO: remove mantine classnames and clean up styles
  return (
    <div
      // component="div"
      className={"bn-slash-menu-item mantine-Menu-item"}
      onClick={props.onClick}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={props.isSelected ? "" : undefined}
      ref={itemRef}>
      {props.icon && (
        <div className="mantine-Menu-itemSection" data-position="left">
          {props.icon}
        </div>
      )}
      <div className="mantine-Menu-itemLabel">
        {/* TODO: move styles to css */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
          }}>
          <p
            style={{
              lineHeight: "20px",
              fontWeight: 500,
              fontSize: "14px",
              margin: 0,
              padding: 0,
            }}>
            {props.title}
          </p>
          <p
            style={{
              lineHeight: "16px",
              fontSize: "10px",
              margin: 0,
              padding: 0,
            }}>
            {props.subtext}
          </p>
        </div>
      </div>
      {props.badge && (
        <div data-position="right" className="mantine-Menu-itemSection">
          <div className="bn-badge-root">
            <span className="bn-badge-label">{props.badge}</span>
          </div>
          {/* <Badge size={"xs"}>{props.badge}</Badge> */}
        </div>
      )}
    </div>
  );
}
