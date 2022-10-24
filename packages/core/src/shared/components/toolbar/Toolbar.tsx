import styles from "./Toolbar.module.css";
import {Group} from "@mantine/core";

export const Toolbar = (props: { children: any }) => {
  return <Group
    p={2}
    className={styles.toolbar}
    noWrap
    grow={false}
    spacing={2}>
    {props.children}
  </Group>;
};
