import Tippy from "@tippyjs/react";
import { useState } from "react";
import { RiLink, RiText } from "react-icons/ri";
import { TooltipContent } from "../../../shared/components/tooltip/TooltipContent";
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
            <Tippy
              content={<TooltipContent mainTooltip="Edit URL" />}
              placement="left">
              <span>
                <RiLink size={20}></RiLink>
              </span>
            </Tippy>
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
            <Tippy
              content={<TooltipContent mainTooltip="Edit title" />}
              placement="left">
              <span>
                <RiText size={20} />
              </span>
            </Tippy>
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
