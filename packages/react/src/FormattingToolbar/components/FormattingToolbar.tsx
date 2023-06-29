import {
  BlockNoteEditor,
  BlockSchema,
  createFormattingToolbarPlugin,
} from "@blocknote/core";

import { PluginKey } from "prosemirror-state";
import { useEffect, useRef, useState } from "react";
import { getBlockNoteTheme } from "../../BlockNoteTheme";
import { EditorElementComponentWrapper } from "../../ElementFactory/components/EditorElementComponentWrapper";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import { ToggledStyleButton } from "./DefaultButtons/ToggledStyleButton";
import { BlockTypeDropdown } from "./DefaultDropdowns/BlockTypeDropdown";

export const FormattingToolbarOld = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />

      <TextAlignButton editor={props.editor as any} textAlignment={"left"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"center"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
};

export const FormattingToolbar = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [params, setParams] = useState<any>();
  const [isHidden, setIsHidden] = useState<boolean>(true);

  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elementRef.current || !props.editor) {
      return;
    }

    if (props.editor._tiptapEditor.isDestroyed) {
      return;
    }

    const pluginKey = new PluginKey("FormattingToolbarPlugin2");

    const plugin = createFormattingToolbarPlugin({
      tiptapEditor: props.editor._tiptapEditor,
      editor: props.editor,
      formattingToolbarFactory: () => ({
        element: elementRef.current!,
        render: (params, isHidden) => {
          setParams(params);
          setIsHidden(false);
        },
        hide: () => {
          setIsHidden(true);
        },
      }),
      pluginKey,
    });

    props.editor._tiptapEditor.registerPlugin(plugin);
    return () => props.editor._tiptapEditor.unregisterPlugin(pluginKey);
  }, [props.editor, elementRef.current]);
  console.log("FormattingToolbar", params, isHidden);
  return (
    <div ref={elementRef}>
      {elementRef.current && props.editor && (
        <EditorElementComponentWrapper
          dynamicParams={params}
          // editor={props.editor}
          // isHidden={isHidden}
          rootElement={elementRef.current!}
          staticParams={{
            editor: props.editor,
          }}
          isOpen={!isHidden}
          theme={getBlockNoteTheme()}
          editorElementComponent={
            FormattingToolbarOld as any
          }></EditorElementComponentWrapper>
      )}
    </div>
  );
};
