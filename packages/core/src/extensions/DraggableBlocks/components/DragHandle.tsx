import Tippy from "@tippyjs/react";
import DragHandleMenu from "./DragHandleMenu";
import styles from "./DragHandle.module.css";
import React from "react";

export const DragHandle = (props: {
  onShow?: () => void;
  onHide?: () => void;
}) => {
  return (
    <Tippy
      content={<DragHandleMenu onDelete={() => alert("not implemented")} />}
      placement={"left"}
      trigger={"click"}
      duration={0}
      interactiveBorder={100}
      interactive={true}
      onShow={props.onShow}
      onHide={props.onHide}>
      <div className={styles.dragHandle} />
    </Tippy>
  );
};
