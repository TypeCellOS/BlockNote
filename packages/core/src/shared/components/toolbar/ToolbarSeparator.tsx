import { Button } from "@mantine/core";
import styles from "./ToolbarSeparator.module.css";

export const ToolbarSeparator = () => {
  //   return <span className={styles.separator}></span>;
  return <Button variant="subtle" className={styles.separator} />;
};
