import {
  DEFAULT_LINK_PROTOCOL,
  LinkToolbarExtension,
  VALID_LINK_PROTOCOLS,
} from "@blocknote/core/extensions";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiLink, RiText } from "react-icons/ri";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";

const validateUrl = (url: string) => {
  for (const protocol of VALID_LINK_PROTOCOLS) {
    if (url.startsWith(protocol)) {
      return url;
    }
  }

  return `${DEFAULT_LINK_PROTOCOL}://${url}`;
};

export const EditLinkMenuItems = (
  props: Pick<
    LinkToolbarProps,
    "url" | "text" | "range" | "setToolbarOpen" | "setToolbarPositionFrozen"
  > & {
    showTextField?: boolean;
  },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { editLink } = useExtension(LinkToolbarExtension);

  const { url, text, showTextField } = props;

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
        editLink(validateUrl(currentUrl), currentText, props.range.from);
        props.setToolbarOpen?.(false);
        props.setToolbarPositionFrozen?.(false);
      }
    },
    [editLink, currentUrl, currentText, props],
  );

  const handleUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentUrl(event.currentTarget.value),
    [],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentText(event.currentTarget.value),
    [],
  );

  const handleSubmit = useCallback(() => {
    editLink(validateUrl(currentUrl), currentText, props.range.from);
    props.setToolbarOpen?.(false);
    props.setToolbarPositionFrozen?.(false);
  }, [editLink, currentUrl, currentText, props]);

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
      {showTextField !== false && (
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
      )}
    </Components.Generic.Form.Root>
  );
};
