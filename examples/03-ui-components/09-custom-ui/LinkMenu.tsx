import { HTMLAttributes, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";

// Formatting Toolbar sub menu for creating links.
export const LinkMenu = (
  props: { editor: BlockNoteEditor } & HTMLAttributes<HTMLDivElement>
) => {
  const { editor, className, ...rest } = props;

  const [text, setText] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  return (
    <div {...rest} className={`link-menu${className ? " " + className : ""}`}>
      {/*Input for link text*/}
      <input
        className={"link-input"}
        placeholder={"Text"}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {/*Input for link URL*/}
      <input
        className={"link-input"}
        placeholder={"URL"}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      {/*Buttons to create and clear the inputs*/}
      <div className={"link-buttons"}>
        <button
          className={"link-button"}
          onClick={() => props.editor.createLink(url, text)}>
          Create
        </button>
        <button
          className={"link-button"}
          onClick={() => {
            setText("");
            setUrl("");
          }}>
          Clear
        </button>
      </div>
    </div>
  );
};
