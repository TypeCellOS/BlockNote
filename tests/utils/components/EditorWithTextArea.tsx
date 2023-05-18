import "@blocknote/core/style.css";
import Editor, { CustomBlocks } from "./Editor";
import styles from "./TextArea.module.css";

export default function EditorWithTextArea(props: {
  blockTypes: (keyof CustomBlocks)[];
}) {
  return (
    <>
      <Editor {...props} />
      <textarea
        id={"pasteZone"}
        className={styles.pasteZone}
        onPaste={(event) => {
          event.preventDefault();
          (event.target as HTMLElement).innerHTML =
            event.clipboardData.getData("text/html");

          return true;
        }}
      />
    </>
  );
}
