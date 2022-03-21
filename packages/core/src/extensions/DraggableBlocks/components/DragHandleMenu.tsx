import styles from "./DragHandleMenu.module.css";
import { MenuGroup, ButtonItem } from "@atlaskit/menu";
import React from "react";

type Props = {
  onDelete: () => void;
};

const DragHandleMenu = (props: Props) => {
  return (
    <div className={styles.menuList}>
      <MenuGroup>
        <ButtonItem onClick={props.onDelete}>Delete</ButtonItem>
      </MenuGroup>
    </div>
  );
};

export default DragHandleMenu;
