import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiLink, RiText } from "react-icons/ri";
import { LinkToolbarProps } from "../LinkToolbarProps";
import { ToolbarInputsMenuItem } from "../../mantine-shared/Toolbar/ToolbarInputsMenuItem";

export const EditLinkMenuItems = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const { url, text, editLink } = props;

  const [currentUrl, setCurrentUrl] = useState<string>(url);
  const [currentText, setCurrentText] = useState<string>(text);

  useEffect(() => {
    setCurrentUrl(url);
    setCurrentText(text);
  }, [text, url]);

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        editLink(currentUrl, currentText);
      }
    },
    [editLink, currentUrl, currentText]
  );

  const handleUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentUrl(event.currentTarget.value),
    []
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentText(event.currentTarget.value),
    []
  );

  const handleSubmit = useCallback(
    () => editLink(currentUrl, currentText),
    [editLink, currentUrl, currentText]
  );

  return (
    <>
      <ToolbarInputsMenuItem
        type={"text"}
        icon={RiLink}
        autoFocus={true}
        placeholder={"Edit URL"}
        value={currentUrl}
        onKeyDown={handleEnter}
        onChange={handleUrlChange}
        onSubmit={handleSubmit}
      />
      <ToolbarInputsMenuItem
        type={"text"}
        icon={RiText}
        placeholder={"Edit Title"}
        value={currentText}
        onKeyDown={handleEnter}
        onChange={handleTextChange}
        onSubmit={handleSubmit}
      />
    </>
  );
};
