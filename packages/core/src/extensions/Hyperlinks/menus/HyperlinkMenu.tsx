import { useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import { Group, MantineProvider, Stack } from "@mantine/core";
import { HyperlinkMenuIcon } from "./HyperlinkMenuIcon";
import { HyperlinkMenuInput } from "./HyperlinkMenuInput";

export type HyperlinkEditorMenuProps = {
  url: string;
  text: string;
  onSubmit: (url: string, text: string) => void;
};

/**
 * The sub menu for editing an anchor element
 */
export const HyperlinkMenu = (props: HyperlinkEditorMenuProps) => {
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
        <Group noWrap={true} spacing={12} px={6}>
          <HyperlinkMenuIcon icon={RiLink} mainTooltip={"Edit URL"} />
          <HyperlinkMenuInput
            autofocus={true}
            placeholder={"Edit URL"}
            value={url}
            onChange={(value) => setUrl(value)}
            onSubmit={() => props.onSubmit(url, title)}
          />
        </Group>
        <Group noWrap={true} spacing={12} px={6}>
          <HyperlinkMenuIcon icon={RiText} mainTooltip={"Edit Title"} />
          <HyperlinkMenuInput
            autofocus={false}
            placeholder={"Edit Title"}
            value={title}
            onChange={(value) => setTitle(value)}
            onSubmit={() => props.onSubmit(url, title)}
          />
        </Group>
      </Stack>
    </MantineProvider>
  );
};
