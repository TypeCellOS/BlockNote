import styled from "styled-components";

// code taken from https://bitbucket.org/atlassian/design-system-mirror/src/master/editor/editor-core/src/ui/PanelTextInput/styles.ts

export const N400 = "#505F79";
export const N800 = "#172B4D";

// Normal .className gets overridden by input[type=text] hence this hack to produce input.className
export const Input = styled.input`
  input& {
    autofocus: true;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-sizing: content-box;
    color: ${N400};
    flex-grow: 1;
    font-size: 13px;
    line-height: 20px;
    padding: 0;
    ${(props) => (props.width ? `width: ${props.width}px` : "")};
    min-width: 145px;

    /* Hides IE10+ built-in [x] clear input button */
    &::-ms-clear {
      display: none;
    }

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: ${N800};
      opacity: 0.5;
    }
  }
`;
