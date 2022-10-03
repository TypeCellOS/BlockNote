// import logo from './logo.svg'
import {
  BlockNoteComposer,
  defaultTheme,
  TreeViewPlugin,
} from "@blocknote/core";
import "@blocknote/core/style.css";

const initialConfig = {
  namespace: "MyEditor",
  theme: defaultTheme,
  onError: (e: any) => {
    console.error(e);
  },
};

function App() {
  return (
    <BlockNoteComposer initialConfig={initialConfig}>
      <TreeViewPlugin />
    </BlockNoteComposer>
  );
}

export default App;
