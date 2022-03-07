import styles from "./ToolbarSeparator.module.css";
import Button from "@atlaskit/button";
import React from "react";

export const ToolbarSeparator = () => {
  //   return <span className={styles.separator}></span>;
  return <Button appearance="subtle" className={styles.separator} />;
};
