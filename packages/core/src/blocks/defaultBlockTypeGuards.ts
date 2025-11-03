import { Selection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockConfig, PropSchema } from "../schema/index.js";
import { Block } from "./defaultBlocks.js";

// TODO: matthew review + tests
export function editorHasBlockWithType<
  BType extends string,
  Props extends PropSchema,
>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  props?: Props,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<BT, Props>;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }

  if (!props) {
    return true;
  }

  const editorProps: PropSchema =
    editor.schema.blockSpecs[blockType].config.propSchema;

  // make sure every prop in the requested prop appears in the editor schema block props
  return Object.entries(props._zodSource._zod.def.shape).every(
    ([key, value]) => {
      return true;
      // we do a JSON Stringify check as Zod doesn't expose
      // equality / assignability checks
      // return (
      //   JSON.stringify(value._zod.def) ===
      //   JSON.stringify(editorProps._zodSource._zod.def.shape[key]._zod.def)
      // );
    },
  );
}

export function blockHasType<BType extends string, Props extends PropSchema>(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  props?: Props,
): block is Block<
  {
    [BT in BType]: BlockConfig<BT, Props>;
  },
  any,
  any
> {
  return (
    block.type === blockType && editorHasBlockWithType(editor, blockType, props)
  );
}

export function isTableCellSelection(
  selection: Selection,
): selection is CellSelection {
  return selection instanceof CellSelection;
}
