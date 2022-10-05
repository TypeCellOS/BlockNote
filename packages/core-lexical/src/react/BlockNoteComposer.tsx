import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  EditorState,
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
} from "lexical";
import { ChildgroupNode } from "../nodes/ChildgroupNode";
import { BlockNotePlugin } from "./BlockNotePlugin";

export type InitialEditorStateType =
  | null
  | string
  | EditorState
  | ((editor: LexicalEditor) => void);

type Props = {
  children: JSX.Element | JSX.Element[];
  initialConfig: Readonly<{
    editor__DEPRECATED?: LexicalEditor | null;
    namespace: string;
    nodes?: ReadonlyArray<Klass<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    editable?: boolean;
    theme?: EditorThemeClasses;
    editorState?: InitialEditorStateType;
  }>;
};

export function BlockNoteComposer({ initialConfig, children }: Props) {
  // TODO: maybe copy lexicalComposer
  initialConfig = {
    ...initialConfig,
    nodes: [
      ...(initialConfig.nodes || []),
      ChildgroupNode,
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      LinkNode,
      AutoLinkNode,
    ] as any,
  };
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <BlockNotePlugin></BlockNotePlugin>
      <div className="editor-scroller">
        <div className="editor">
          <ContentEditable className="ContentEditable__root" />
        </div>
      </div>
      <>{children}</>
    </LexicalComposer>
  );
}
