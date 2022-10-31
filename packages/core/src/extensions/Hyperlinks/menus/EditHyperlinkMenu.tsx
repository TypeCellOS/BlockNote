import { useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import { MantineProvider, Stack } from "@mantine/core";
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
export const EditHyperlinkMenu = (props: EditHyperlinkMenuProps) => {
  const [url, setUrl] = useState(props.url);
  const [title, setTitle] = useState(props.text);

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      inherit
      theme={{
        components: {
          TextInput: {
            styles: {
              root: {
                background: "transparent",
                width: "300px",
              },
              input: {
                fontSize: "12px",
                border: 0,
                padding: 0,
              },
            },
          },
        },
      }}>
      <Stack
        spacing={4}
        p={6}
        sx={{
          backgroundColor: "white",
          borderRadius: "3px",
          boxShadow:
            "rgb(9 30 66 / 31%) 0px 0px 1px, rgb(9 30 66 / 25%) 0px 4px 8px -2px",
          minWidth: "145px",
          width: "fit-content",
        }}>
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
    </MantineProvider>
  );
};
