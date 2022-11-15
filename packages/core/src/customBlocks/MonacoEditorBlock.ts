import { CustomBlock } from "./customBlock";
import { editor } from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import "./styles.css";

export const MonacoEditorBlock: CustomBlock = {
  type: "monacoEditor",
  atom: true,
  selectable: false,

  attributes: { content: "", language: "js", theme: "vs-dark" },

  element: (props) => {
    const element = document.createElement("div");
    const editorElement = document.createElement("div");
    element.appendChild(editorElement);

    self.MonacoEnvironment = {
      getWorker(_, label) {
        if (label === "json") {
          return new jsonWorker();
        }
        if (label === "css" || label === "scss" || label === "less") {
          return new cssWorker();
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return new htmlWorker();
        }
        if (label === "typescript" || label === "javascript") {
          return new tsWorker();
        }
        return new editorWorker();
      },
    };

    editor.create(editorElement, {
      value: props.HTMLAttributes["content"],
      language: props.HTMLAttributes["language"],
      theme: props.HTMLAttributes["theme"],
    });

    return {
      element: element,
    };
  },
};
