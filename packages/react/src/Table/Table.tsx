// import styles from "../../Block.module.css";

import { Table } from "@tiptap/extension-table";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { keymap } from "prosemirror-keymap";
import { EditorState, Selection } from "prosemirror-state";
import { EditorView, NodeView } from "prosemirror-view";
import { TableElement } from "./TableElement";

function arrowHandler(
  dir: "up" | "down" | "left" | "right" | "forward" | "backward"
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (state: EditorState, dispatch: any, view: EditorView) => {
    if (state.selection.empty && view.endOfTextblock(dir)) {
      const side = dir === "left" || dir === "up" ? -1 : 1;
      const $head = state.selection.$head;
      const nextPos = Selection.near(
        state.doc.resolve(side > 0 ? $head.after() : $head.before()),
        side
      );
      console.log("nextPos", nextPos.$head.parent.type.name);
      if (nextPos.$head && nextPos.$head.parent.type.name === "monaco") {
        dispatch(state.tr.setSelection(nextPos));
        return true;
      }
    }
    return false;
  };
}

const arrowHandlers = keymap({
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

const ComponentWithWrapper = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: NodeViewProps & { block: any; htmlAttributes: any; selectionHack: any }
) => {
  const { htmlAttributes, ...restProps } = props;
  return (
    <NodeViewWrapper
      // className={blockStyles.blockContent}
      // data-content-type={blockConfig.type}
      {...htmlAttributes}>
      <TableElement {...restProps} />
    </NodeViewWrapper>
  );
};

// TODO: clean up listeners
export const BNTable = Table.extend<any>({
  name: "table",
  // content: "tableRow+",
  editable: true,
  selectable: true,
  tableRole: "table",
  isolating: true,
  group: "blockContent",
  // addAttributes() {
  //   return {
  //     language: {
  //       default: "typescript",
  //       parseHTML: (element) => element.getAttribute("data-language"),
  //       renderHTML: (attributes) => {
  //         return {
  //           "data-language": attributes.level,
  //         };
  //       },
  //     },
  //   };
  // },

  // parseHTML() {
  //   return [
  //     {
  //       tag: "table",
  //       priority: 200,
  //       node: "table",
  //     },
  //   ];
  // },

  // renderHTML({ HTMLAttributes }) {
  //   return [
  //     "table",
  //     mergeAttributes(HTMLAttributes, {
  //       // class: styles.blockContent,
  //       "data-content-type": this.name,
  //     }),
  //     ["table", 0],
  //   ];
  // },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BlockContent = (props: any) => {
      // const Content = blockConfig.render;

      // Add props as HTML attributes in kebab-case with "data-" prefix
      const htmlAttributes: Record<string, string> = {};
      // for (const [attribute, value] of Object.entries(props.node.attrs)) {
      // if (attribute in blockConfig.propSchema) {
      //   htmlAttributes[camelToDataKebab(attribute)] = value;
      // }
      // }

      // Gets BlockNote editor instance
      const editor = this.options.editor;
      // Gets position of the node
      const pos =
        typeof props.getPos === "function" ? props.getPos() : undefined;
      // Gets TipTap editor instance
      const tipTapEditor = editor._tiptapEditor;
      // Gets parent blockContainer node
      const blockContainer = tipTapEditor.state.doc.resolve(pos).node();
      // Gets block identifier
      const blockIdentifier = blockContainer.attrs.id;
      // Get the block
      const block = editor.getBlock(blockIdentifier);

      console.log("ComponentWithWrapper");
      return (
        <ComponentWithWrapper
          htmlAttributes={htmlAttributes}
          block={block}
          editor={editor}
          {...props}
          // ref={ref}
        />
      );
    };
    // console.log("addnodeview");
    return (props) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(props.editor as any).contentComponent) {
        // same logic as in ReactNodeViewRenderer
        return {};
      }
      const ret = ReactNodeViewRenderer(BlockContent, {
        stopEvent: () => true,
      })(props) as NodeView;
      // manual hack, because tiptap React nodeviews don't support setSelection
      ret.setSelection = (anchor, head) => {
        // This doesn't work because the Tiptap react renderer doesn't properly support forwardref
        // (ret as any).renderer.ref?.setSelection(anchor, head);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ret as any).renderer.updateProps({
          selectionHack: { anchor, head },
        });
      };

      // disable contentdom, because we render the content ourselves in MonacoElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ret as any).contentDOMElement = undefined;
      // ret.destroy = () => {
      //   console.log("destroy element");
      //   // (ret as any).renderer.destroy();
      // };
      // This is a hack because tiptap doesn't support innerDeco, and this information is normally dropped
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const oldUpdated = ret.update!.bind(ret);
      ret.update = (node, outerDeco, innerDeco) => {
        // console.log("update");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const retAsAny = ret as any;
        let decorations = retAsAny.decorations;
        if (
          retAsAny.decorations.decorations !== outerDeco ||
          retAsAny.decorations.innerDecorations !== innerDeco
        ) {
          // change the format of "decorations" to have both the outerDeco and innerDeco
          decorations = {
            decorations: outerDeco,
            innerDecorations: innerDeco,
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return oldUpdated(node, decorations, undefined as any);
      };
      return ret;
    };
  },
  addProseMirrorPlugins() {
    return [arrowHandlers];
  },

  // extendNodeSchema(extension) {
  //   const context = {
  //     name: extension.name,
  //     options: extension.options,
  //     storage: extension.storage,
  //   };

  //   return {
  //     tableRole: callOrReturn(
  //       getExtensionField(extension, "tableRole", context)
  //     ),
  //   };
  // },
});
