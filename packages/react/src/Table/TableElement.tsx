/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NodeViewProps } from "@tiptap/core";

import { Fragment, Slice } from "prosemirror-model";
import React, { useCallback, useEffect, useMemo } from "react";

import DataEditor, {
  CompactSelection,
  DataEditorRef,
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  GridMouseEventArgs,
  GridSelection,
  Item,
  Rectangle,
} from "@glideapps/glide-data-grid";
import { GetRowThemeCallback } from "@glideapps/glide-data-grid/dist/ts/data-grid/data-grid-render";
import { CellSelection, TableMap, addRow } from "prosemirror-tables";

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

function findCellNonExact(map: TableMap, pos: number) {
  for (let i = 0; i < map.map.length; i++) {
    let curPos = map.map[i];
    if (curPos < pos) {
      continue;
    } else if (curPos > pos) {
      i--;
      curPos = map.map[i];
    }
    const left = i % map.width;
    const top = (i / map.width) | 0;
    let right = left + 1;
    let bottom = top + 1;
    for (let j = 1; right < map.width && map.map[i + j] == curPos; j++) {
      right++;
    }
    for (
      let j = 1;
      bottom < map.height && map.map[i + map.width * j] == curPos;
      j++
    ) {
      bottom++;
    }
    return { left, top, right, bottom };
  }
  throw new RangeError(`No cell with offset ${pos} found`);
}

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
  const map = TableMap.get(props.node);
  const { node, getPos, editor } = props;

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
        data: pmCol.textContent || "",
        allowOverlay: true,
        readonly: false,
        displayData: pmCol.textContent || "",
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

  const [selection, setSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  useEffect(() => {
    console.log("selected effect", props.selected);
    if (props.selected) {
      ref.current?.focus();
    }
  }, [props.selected]);

  // TODO: buggy
  useEffect(() => {
    console.log("selectionHack effect", props.selectionHack);
    if (!props.selectionHack) {
      return;
    }

    const nodePos = getPos();
    const head = props.selectionHack.head + nodePos;
    console.log("selectionHack calc", head);
    // if (head < nodePos || head > nodePos + node.nodeSize) {
    //   return;
    // }
    // const pos = props.editor.view.state.doc.resolve(head);

    const cell = findCellNonExact(map, props.selectionHack.head - 1);
    console.log("CELL", cell);

    setSelection({
      current: {
        range: {
          height: 1,
          width: 1,
          x: cell.left,
          y: cell.top,
        },
        cell: [cell.left, cell.top],
        rangeStack: [],
      },
      columns: CompactSelection.fromSingleSelection(cell.left),
      rows: CompactSelection.fromSingleSelection(cell.top),
    });

    ref.current?.focus();
  }, [props.selectionHack?.head, map, getPos, props.selectionHack]);

  const onGridSelectionChange = React.useCallback(
    (selection: GridSelection) => {
      if (!selection.current) {
        return;
      }
      const pos =
        map.positionAt(
          selection.current.cell[1],
          selection.current.cell[0],
          node
        ) +
        getPos() +
        1;
      const tr = editor.view.state.tr;
      const pmSelection = CellSelection.create(tr.doc, pos);

      // @ts-ignore
      tr.setSelection(pmSelection);
      editor.view.dispatch(tr);

      setSelection(selection);
    },
    [map, node, editor, getPos]
  );

  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) {
        console.error("wrong new kind");
        // we only have text cells, might as well just die here.
        return;
      }
      const [col, row] = cell;

      const pmRow = node.child(row);
      //   const node = props.node;

      if (pmRow.childCount < col + 1) {
        console.error("wrong col size");
        return;
      }
      const state = editor.view.state;
      const startPos = getPos() + map.positionAt(row, col, node) + 2;

      const fragmentContent = newValue.data.length
        ? state.schema.text(newValue.data)
        : Fragment.empty;
      const pmCol = pmRow.child(col);
      console.log(
        "replace ",
        startPos,
        startPos + pmCol.nodeSize - 2,
        fragmentContent
      );
      const tr = state.tr.replace(
        startPos,
        startPos + pmCol.nodeSize - 2,
        new Slice(Fragment.from(fragmentContent), 0, 0)
      );

      editor.view.dispatch(tr);
      // props.editor.view.state.tr.replace(pmCol.)
      // const indexes: (keyof Person)[] = ["firstName", "lastName"];
      // const [col, row] = cell;
      // const key = indexes[col];
      // data[row][key] = newValue.data;
      // debugger;
    },
    [map, node, editor, getPos]
  );

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

    const tr = addRow(
      props.editor.view.state.tr,
      {
        map,
        table: props.node,
        tableStart: props.getPos(),
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
      },
      map.height
    );

    props.editor.view.dispatch(tr);
  }, [props.node, map, map.height, props.editor, props.getPos]);

  const columns = useMemo(() => {
    const cols: GridColumn[] = [];
    for (let i = 0; i < map.width; i++) {
      cols.push({ id: i + "", title: `Column ${i}`, hasMenu: true });
    }
    return cols;
  }, [map.width]);

  const [hoverRow, setHoverRow] = React.useState<number | undefined>(undefined);

  const onItemHovered = React.useCallback((args: GridMouseEventArgs) => {
    const [_, row] = args.location;
    setHoverRow(args.kind !== "cell" ? undefined : row);
  }, []);

  const getRowThemeOverride = React.useCallback<GetRowThemeCallback>(
    (row) => {
      if (row !== hoverRow) return undefined;
      return {
        bgCell: "#f7f7f7",
        bgCellMedium: "#f0f0f0",
      };
    },
    [hoverRow]
  );

  const onHeaderMenuClick = React.useCallback(
    (col: number, bounds: Rectangle) => {
      // setMenu({ col, bounds });
    },
    []
  );

  return (
    <div contentEditable={false}>
      <DataEditor
        ref={ref}
        onCellEdited={onCellEdited}
        getCellContent={getData}
        columns={columns}
        rows={map.height - 1}
        trailingRowOptions={{
          // How to get the trailing row to look right
          sticky: true,
          tint: true,
          hint: "New row...",
        }}
        onRowAppended={onRowAppended}
        getRowThemeOverride={getRowThemeOverride}
        onItemHovered={onItemHovered}
        onHeaderMenuClick={onHeaderMenuClick}
        onGridSelectionChange={onGridSelectionChange}
        gridSelection={selection}
      />
      <div id="portal"></div>
    </div>
  );
};

// TODO: check why this doesn't work
export const TableElement = React.memo(TableElementComponent);
