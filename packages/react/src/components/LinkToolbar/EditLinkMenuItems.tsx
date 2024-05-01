import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiLink, RiText } from "react-icons/ri";
import { useComponentsContext } from "../../editor/ComponentsContext";
import { useDictionary } from "../../i18n/dictionary";
import { LinkToolbarProps } from "./LinkToolbarProps";

export const EditLinkMenuItems = (
  props: Pick<LinkToolbarProps, "url" | "text" | "editLink">
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

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
    <Components.Generic.Form.Root>
      {/* // TODO: add labels? */}
      <Components.Generic.Form.TextInput
        className={"bn-text-input"}
        name="url"
        icon={<RiLink />}
        autoFocus={true}
        placeholder={dict.link_toolbar.form.url_placeholder}
        value={currentUrl}
        onKeyDown={handleEnter}
        onChange={handleUrlChange}
        onSubmit={handleSubmit}
      />
      <Components.Generic.Form.TextInput
        className={"bn-text-input"}
        name="title"
        icon={<RiText />}
        placeholder={dict.link_toolbar.form.title_placeholder}
        value={currentText}
        onKeyDown={handleEnter}
        onChange={handleTextChange}
        onSubmit={handleSubmit}
      />
    </Components.Generic.Form.Root>
  );
};
