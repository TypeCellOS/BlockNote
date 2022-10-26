import styles from "./DragHandleMenu.module.css";
import { Menu } from "@mantine/core";

type Props = {
  onDelete: () => void;
};

const DragHandleMenu = (props: Props) => {
  return (
    <div className={styles.menuList}>
      <Menu defaultOpened={true}>
        <Menu.Dropdown>
          <Menu.Item onClick={props.onDelete}>Delete</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
};

export default DragHandleMenu;
