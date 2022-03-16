import React from "react";
import { DropdownItem } from "@atlaskit/dropdown-menu";
import { IconType } from "react-icons/lib";
import { TiTick } from "react-icons/ti";
import styles from "./DropdownBlockItem.module.css";

interface DropdownBlockItemProps {
  title: string;
  icon: IconType;
  isSelected?: boolean;
  onClick?: () => void;
}
export default function DropdownBlockItem(props: DropdownBlockItemProps) {
  const ItemIcon = props.icon;
  return (
    <DropdownItem onClick={props.onClick}>
      <div className={`${styles.item_container}`}>
        <div className={`${styles.logo_and_item_container}`}>
          <ItemIcon />
          {props.title}
        </div>
        {props.isSelected && <TiTick />}
      </div>
    </DropdownItem>
  );
}
