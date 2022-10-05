// import logo from './logo.svg'
import {
  BlockNoteComposer,
  defaultTheme,
  TreeViewPlugin,
} from "@blocknote/core-lexical";
import "@blocknote/core-lexical/style.css";

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
