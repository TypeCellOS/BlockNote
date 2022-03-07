import styles from "./Toolbar.module.css";
import React from "react";

export const Toolbar = (props: { children: any }) => {
  return <div className={styles.toolbar}>{props.children}</div>;
};
