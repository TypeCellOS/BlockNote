/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NodeViewProps } from "@tiptap/core";

import React, { useCallback } from "react";

import DataEditor, {
  DataEditorRef,
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
} from "@glideapps/glide-data-grid";
import { TableMap, addRow } from "prosemirror-tables";

const columns: GridColumn[] = [
  { title: "First Name", width: 100 },
  { title: "Last Name", width: 100 },
];

interface Person {
  firstName: string;
  lastName: string;
}

const data: Person[] = [
  { firstName: "John", lastName: "Doe" },
  { firstName: "Jane", lastName: "Doe" },
  { firstName: "John", lastName: "Smith" },
  { firstName: "Jane", lastName: "Smith" },
  { firstName: "John", lastName: "Jones" },
  { firstName: "Jane", lastName: "Jones" },
  { firstName: "John", lastName: "Williams" },
  { firstName: "Jane", lastName: "Williams" },
];

function getData([col, row]: Item): GridCell {
  const person = data[row];

  if (col === 0) {
    return {
      kind: GridCellKind.Text,
      data: person.firstName,
      allowOverlay: true,
      readonly: false,
      displayData: person.firstName,
    } satisfies GridCell;
  } else if (col === 1) {
    return {
      kind: GridCellKind.Text,
      data: person.lastName,
      allowOverlay: true,
      readonly: false,
      displayData: person.lastName,
    } satisfies GridCell;
  } else {
    throw new Error();
  }
}

const TableElementComponent = function TableElement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: NodeViewProps & { block: any; selectionHack: any }
) {
  const ref = React.useRef<DataEditorRef>(null);

  const getData = useCallback(
    ([col, row]: Item) => {
      const pmRow = props.node.child(row);
      //   const node = props.node;

      if (pmRow.childCount < col + 1) {
        return {
          kind: GridCellKind.Loading,
          allowOverlay: true,
        } satisfies GridCell;
      }

      const pmCol = pmRow.child(col);

      return {
        kind: GridCellKind.Text,
        data: pmCol.textContent,
        allowOverlay: true,
        readonly: false,
        displayData: pmCol.textContent,
      } satisfies GridCell;
    },
    [props.node]
  );

  //   useEffect(() => {
  //     if (models.model.isDisposed()) {
  //       return;
  //     }
  //     models.state.isUpdating = true;
  //     models.state.node = props.node;
  //     try {
  //       applyNodeChangesToMonaco(props.node, models.model);
  //       models.state.lastDecorations = applyDecorationsToMonaco(
  //         models.model,
  //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //         props.decorations as any,
  //         editorRef.current!,
  //         models.state.lastDecorations,
  //         monacoStyles.yRemoteSelectionHead,
  //         monacoStyles.yRemoteSelection
  //       );
  //     } finally {
  //       models.state.isUpdating = false;
  //     }
  //   }, [props.node, props.decorations, models]);

  //   useEffect(() => {
  //     console.log("selected effect", props.selected);
  //     if (props.selected) {
  //       editorRef.current?.focus();
  //     }
  //   }, [props.selected]);

  //   useEffect(() => {
  //     // console.log("selectionHack effect", props.selectionHack);
  //     if (!props.selectionHack) {
  //       return;
  //     }
  //     const startPos = models.model.getPositionAt(props.selectionHack.anchor);
  //     const endPos = models.model.getPositionAt(props.selectionHack.head);
  //     models.state.isUpdating = true;
  //     editorRef.current?.setSelection(
  //       monaco.Selection.fromPositions(startPos, endPos)
  //     );
  //     models.state.isUpdating = false;
  //     editorRef.current?.focus();
  //   }, [models.model, models.state, props.selectionHack]);

  const onCellEdited = useCallback((cell: Item, newValue: EditableGridCell) => {
    if (newValue.kind !== GridCellKind.Text) {
      // we only have text cells, might as well just die here.
      return;
    }

    const indexes: (keyof Person)[] = ["firstName", "lastName"];
    const [col, row] = cell;
    const key = indexes[col];
    data[row][key] = newValue.data;
    debugger;
  }, []);

  const onRowAppended = React.useCallback(() => {
    // const newRow = numRows;
    // our data source is a mock source that pre-fills data, so we are just clearing this here. You should not
    // need to do this.
    // for (let c = 0; c < cols.length; c++) {
    //   const cell = getCellContent([c, newRow]);
    //   setCellValueRaw([c, newRow], clearCell(cell));
    // }
    // Tell the data grid there is another row
    // setNumRows((cv) => cv + 1);
    const map = TableMap.get(props.node);
    const tr = addRow(
      props.editor.view.state.tr,
      {
        map,
        table: props.node,
        tableStart: props.getPos() + 1,
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
      },
      0
    );

    props.editor.view.dispatch(tr);
  }, [props.node]);

  return (
    <div contentEditable={false}>
      <DataEditor
        ref={ref}
        onCellEdited={onCellEdited}
        getCellContent={getData}
        columns={[{ title: "First Name", width: 100 }]}
        rows={props.node.childCount}
        trailingRowOptions={{
          // How to get the trailing row to look right
          sticky: true,
          tint: true,
          hint: "New row...",
        }}
        onRowAppended={onRowAppended}
      />
      <div id="portal"></div>
    </div>
  );
};

// TODO: check why this doesn't work
export const TableElement = React.memo(TableElementComponent);
