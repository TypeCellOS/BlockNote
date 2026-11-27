import { empty } from "./empty.js";
import { standardBlocks } from "./standardBlocks.js";
import { markup } from "./markup.js";
import { equations } from "./equations.js";
import { tables } from "./tables.js";
import { columns } from "./columns.js";

export { empty, standardBlocks, markup, equations, tables, columns };

export const presets = [
  { id: "empty", label: "Empty document", blocks: empty },
  { id: "standard", label: "Basic blocks", blocks: standardBlocks },
  { id: "markup", label: "Markup", blocks: markup },
  { id: "equations", label: "Math and diagram blocks", blocks: equations },
  { id: "tables", label: "Advanced tables", blocks: tables },
  { id: "columns", label: "Column layouts", blocks: columns },
];
