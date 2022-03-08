import Tooltip from "@atlaskit/tooltip";
import { useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import PanelTextInput from "./atlaskit/PanelTextInput";
import {
  Container,
  ContainerWrapper,
  IconWrapper,
  TextInputWrapper,
  UrlInputWrapper,
} from "./atlaskit/ToolbarComponent";

export type HyperlinkEditorMenuProps = {
  url: string;
  text: string;
  onSubmit: (url: string, text: string) => void;
};

/**
 * The sub menu for editing an anchor element
 */
export const HyperlinkEditMenu = (props: HyperlinkEditorMenuProps) => {
  const [url, setUrl] = useState(props.url);
  const [text, setText] = useState(props.text);

  return (
    <ContainerWrapper>
      <Container provider={false}>
        <UrlInputWrapper>
          <IconWrapper>
            <Tooltip content={"Edit URL"} position={"left"}>
              <RiLink size={20}></RiLink>
            </Tooltip>
          </IconWrapper>
          <PanelTextInput
            defaultValue={url}
            autoFocus={true}
            onSubmit={(value) => {
              props.onSubmit(value, text);
            }}
            onChange={(value) => {
              setUrl(value);
            }}></PanelTextInput>
        </UrlInputWrapper>
        <TextInputWrapper>
          <IconWrapper>
            <Tooltip content={"Edit title"} position={"left"}>
              <RiText size={20}></RiText>
            </Tooltip>
          </IconWrapper>
          <PanelTextInput
            defaultValue={text!}
            onSubmit={(value) => {
              props.onSubmit(url, value);
            }}
            onChange={(value) => {
              setText(value);
            }}></PanelTextInput>
        </TextInputWrapper>
      </Container>
    </ContainerWrapper>
  );
};
