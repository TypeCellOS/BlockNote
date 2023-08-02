import DataEditor, {
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
} from "@glideapps/glide-data-grid";
import { useCallback } from "react";
import { createReactBlockSpec } from "../ReactBlockSpec";

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
    };
  } else if (col === 1) {
    return {
      kind: GridCellKind.Text,
      data: person.lastName,
      allowOverlay: true,
      readonly: false,
      displayData: person.lastName,
    };
  } else {
    throw new Error();
  }
}

function MyTable(props: {}) {
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

  return (
    <>
      <DataEditor
        onCellEdited={onCellEdited}
        getCellContent={getData}
        columns={columns}
        rows={data.length}
      />
      <div id="portal"></div>
    </>
  );
}

export const Table = createReactBlockSpec({
  containsInlineContent: false,
  propSchema: {},
  render: (attrs) => {
    return <MyTable />;
  },
  type: "table",
});
debugger;
Table.node.config.content = "tableRow";
