import { Mark } from "@tiptap/core";
import { StyleConfig, StyleSpec } from "./types";

export type CustomStyleImplementation = {
  render: () => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  // Exports block to external HTML. If not defined, the output will be the same
  // as `render(...).dom`. Used to create clipboard data when pasting outside
  // BlockNote.
  // TODO: Maybe can return undefined to ignore when serializing?
  // toExternalHTML?: (
  //   block: BlockFromConfig<T, I, S>,
  //   editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>
  // ) => {
  //   dom: HTMLElement;
  //   contentDOM?: HTMLElement;
  // };
};

export function createStyleSpec<T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: CustomStyleImplementation
): StyleSpec<T> {
  const mark = Mark.create({
    name: styleConfig.type,
    renderHTML() {
      const renderResult = styleImplementation.render();
      return {
        dom: renderResult.dom,
        contentDOM: renderResult.contentDOM,
      };
    },
  });

  return {
    config: styleConfig,
    implementation: {
      mark,
    },
  };
}
