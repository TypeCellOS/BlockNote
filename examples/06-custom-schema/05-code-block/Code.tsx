"use client";

import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import CodeMirror from "@uiw/react-codemirror";
import {
  langs,
  langNames,
  LanguageName,
} from "@uiw/codemirror-extensions-langs";
import { material } from "@uiw/codemirror-theme-material";
import "./styles.css";

export const Code = createReactBlockSpec(
  {
    type: "codeBlock",
    content: "none",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      data: {
        default: "",
      },
      language: {
        default: "javascript",
      },
    },
  },
  {
    render: (props) => {
      const { data } = props.block.props;
      const { language } = props.block.props;
      const onInputChange = (val: string) => {
        props.editor.updateBlock(props.block, {
          props: {
            ...props.block.props,
            data: val,
          },
        });
      };

      return (
        <div className={"code-block"}>
          <div className={"code-block-language-wrapper"}>{language}</div>
          <CodeMirror
            id={props.block.id}
            placeholder={"Write your code here..."}
            style={{
              width: "100%",
            }}
            extensions={[langs[language as LanguageName]()]}
            value={data}
            theme={material}
            editable={props.editor.isEditable}
            onChange={onInputChange}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
            }}
          />
        </div>
      );
    },
  }
);
