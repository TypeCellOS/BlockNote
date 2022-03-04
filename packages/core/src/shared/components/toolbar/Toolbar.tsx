import styles from "./Toolbar.module.css";

export const Toolbar = (props: { children: any }) => {
  return <div className={styles.toolbar}>{props.children}</div>;
};
