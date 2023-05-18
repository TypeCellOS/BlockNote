import { createStyles, Stack } from "@mantine/core";
import { forwardRef, useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import { EditHyperlinkMenuItem } from "./EditHyperlinkMenuItem";

export type EditHyperlinkMenuProps = {
  url: string;
  text: string;
  update: (url: string, text: string) => void;
};

/**
 * Menu which opens when editing an existing hyperlink or creating a new one.
 * Provides input fields for setting the hyperlink URL and title.
 */
export const EditHyperlinkMenu = forwardRef<
  HTMLDivElement,
  EditHyperlinkMenuProps
>((props, ref) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "EditHyperlinkMenu",
  });

  const [url, setUrl] = useState(props.url);
  const [title, setTitle] = useState(props.text);

  return (
    <Stack className={classes.root} ref={ref}>
      <EditHyperlinkMenuItem
        icon={RiLink}
        mainIconTooltip={"Edit URL"}
        autofocus={true}
        placeholder={"Edit URL"}
        value={url}
        onChange={(value) => setUrl(value)}
        onSubmit={() => props.update(url, title)}
      />
      <EditHyperlinkMenuItem
        icon={RiText}
        mainIconTooltip={"Edit Title"}
        placeholder={"Edit Title"}
        value={title}
        onChange={(value) => setTitle(value)}
        onSubmit={() => props.update(url, title)}
      />
    </Stack>
  );
});
