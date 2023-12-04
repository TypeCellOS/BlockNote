import "@blocknote/core/style.css";
import Editor from "./Editor";
import styles from "./TextArea.module.css";

export default function EditorWithTextArea() {
  return (
    <>
      <Editor />
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
