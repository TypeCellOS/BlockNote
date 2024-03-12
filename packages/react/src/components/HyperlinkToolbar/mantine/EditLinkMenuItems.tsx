import { HyperlinkToolbarProps } from "../HyperlinkToolbarProps";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ToolbarInputsMenuItem } from "../../mantine-shared/Toolbar/ToolbarInputsMenuItem";
import { RiLink, RiText } from "react-icons/ri";

export const EditLinkMenuItems = (
  props: Pick<HyperlinkToolbarProps, "url" | "text" | "editHyperlink">
) => {
  const { url, text, editHyperlink } = props;

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
        editHyperlink(currentUrl, currentText);
      }
    },
    [editHyperlink, currentUrl, currentText]
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
    () => editHyperlink(currentUrl, currentText),
    [editHyperlink, currentUrl, currentText]
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
