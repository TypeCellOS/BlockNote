// source: https://github.com/facebook/lexical/blob/3d9bf5931520a482986aa93be863b17e11ecb900/packages/lexical-playground/src/plugins/TreeViewPlugin/index.tsx#L5

// import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TreeView } from "@lexical/react/LexicalTreeView";

export function TreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeView
      viewClassName="tree-view-output"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      editor={editor}
    />
  );
}
