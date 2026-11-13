import { LinkToolbarExtension } from "@blocknote/core/extensions";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { ScreenReaderOnlySubmit } from "../Form/ScreenReaderOnlySubmit.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";

export const EditLinkMenuItems = (
  props: Pick<
    LinkToolbarProps,
    "url" | "text" | "range" | "setToolbarOpen" | "setToolbarPositionFrozen"
  > & {
    showTextField?: boolean;
    onSubmit?: (url: string, text: string) => void;
  },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  // eslint-disable-next-line @typescript-eslint/unbound-method -- editLink and normalizeUrl are plain object methods, not class methods
  const { editLink, normalizeUrl } = useExtension(LinkToolbarExtension);

  const { url, text, showTextField } = props;

  const [currentUrl, setCurrentUrl] = useState<string>(url);
  const [currentText, setCurrentText] = useState<string>(text);

  useEffect(() => {
    // Reset the controlled form when a different link is selected.
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentUrl(url);
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentText(text);
  }, [text, url]);

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
    if (props.onSubmit) {
      props.onSubmit(
        currentUrl === "" ? currentUrl : normalizeUrl(currentUrl),
        currentText,
      );
    } else {
      editLink(normalizeUrl(currentUrl), currentText, props.range.from);
    }
    props.setToolbarOpen?.(false);
    props.setToolbarPositionFrozen?.(false);
  }, [editLink, normalizeUrl, currentUrl, currentText, props]);

  return (
    <Components.Generic.Form.Root
      onSubmit={handleSubmit}
      submitButton={<ScreenReaderOnlySubmit />}
    >
      {/* // TODO: add labels? */}
      <Components.Generic.Form.TextInput
        className={"bn-text-input"}
        name="url"
        icon={<RiLink />}
        autoFocus={true}
        placeholder={dict.link_toolbar.form.url_placeholder}
        value={currentUrl}
        onChange={handleUrlChange}
      />
      {showTextField !== false && (
        <Components.Generic.Form.TextInput
          className={"bn-text-input"}
          name="title"
          icon={<RiText />}
          placeholder={dict.link_toolbar.form.title_placeholder}
          value={currentText}
          onChange={handleTextChange}
        />
      )}
    </Components.Generic.Form.Root>
  );
};
