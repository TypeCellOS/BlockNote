// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensTableCell, LensTableContent } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { mergeTableContent } from "./table.js";
import { mergeOptions } from "../testUtil/merge.js";

function cell(text: string, backgroundColor = "default"): LensTableCell {
  return {
    type: "tableCell",
    props: {
      colspan: 1,
      rowspan: 1,
      backgroundColor,
      textColor: "default",
      textAlignment: "left",
    },
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
  };
}

function table(rows: LensTableCell[][]): LensTableContent {
  return {
    type: "tableContent",
    columnWidths: rows[0]?.map(() => undefined) ?? [],
    rows: rows.map((cells) => ({ cells })),
  };
}

/** The text of each cell, and its color if it is not the default. */
function grid(content: LensTableContent): string[][] {
  return content.rows.map((row) =>
    (row.cells as LensTableCell[]).map((each) => {
      const text = each.content
        .map((item) => (item as { text: string }).text)
        .join("");
      const color = each.props.backgroundColor;
      return color === "default" ? text : `${text} (${String(color)})`;
    }),
  );
}

const WORDS = ["a", "b", "c", "one two", "", "x y"];

function randomTable(random: Random): LensTableContent {
  const width = 1 + random.int(3);
  return table(
    Array.from({ length: 1 + random.int(4) }, () =>
      Array.from({ length: width }, () => cell(random.pick(WORDS))),
    ),
  );
}

/** Random edits: a cell text, a cell color, a new row, a removed row. */
function edit(random: Random, content: LensTableContent): LensTableContent {
  const rows = content.rows.map((row) => [...(row.cells as LensTableCell[])]);
  const width = rows[0]?.length ?? 1;
  for (let k = random.int(4); k > 0; k--) {
    const r = random.int(rows.length);
    switch (random.int(4)) {
      case 0:
        if (rows.length > 0) {
          rows[r][random.int(width)] = cell(`new ${k}`);
        }
        break;
      case 1:
        if (rows.length > 0) {
          const c = random.int(width);
          rows[r][c] = {
            ...rows[r][c],
            props: { ...rows[r][c].props, backgroundColor: "red" },
          };
        }
        break;
      case 2:
        rows.splice(
          random.int(rows.length + 1),
          0,
          Array.from({ length: width }, () => cell(`row ${k}`)),
        );
        break;
      default:
        if (rows.length > 1) {
          rows.splice(r, 1);
        }
    }
  }
  return table(rows);
}

describe("mergeTableContent: laws on random tables", () => {
  for (const concurrent of [false, true]) {
    const mode = concurrent ? "document merge" : "target stage";

    it(`gives theirs if ours did not change (${mode})`, () => {
      const random = createRandom(concurrent ? 121 : 122);
      for (let run = 0; run < 200; run++) {
        const base = randomTable(random);
        const theirs = edit(random, base);
        expect(
          grid(mergeTableContent(base, base, theirs, mergeOptions(concurrent))),
        ).toEqual(grid(theirs));
      }
    });

    it(`gives ours if theirs did not change (${mode})`, () => {
      const random = createRandom(concurrent ? 123 : 124);
      for (let run = 0; run < 200; run++) {
        const base = randomTable(random);
        const ours = edit(random, base);
        expect(
          grid(mergeTableContent(base, ours, base, mergeOptions(concurrent))),
        ).toEqual(grid(ours));
      }
    });

    it(`gives the change one time if the two sides made the same change (${mode})`, () => {
      const random = createRandom(concurrent ? 125 : 126);
      for (let run = 0; run < 200; run++) {
        const base = randomTable(random);
        const changed = edit(random, base);
        let conflicts = 0;
        const result = mergeTableContent(
          base,
          changed,
          changed,
          mergeOptions(concurrent, () => conflicts++),
        );
        expect(grid(result)).toEqual(grid(changed));
        expect(conflicts).toBe(0);
      }
    });
  }

  it("keeps the changes of two writers to different rows (document merge)", () => {
    const random = createRandom(127);
    for (let run = 0; run < 100; run++) {
      const rows = Array.from({ length: 4 + random.int(4) }, (_, r) => [
        cell(`r${r} a`),
        cell(`r${r} b`),
      ]);
      const i = random.int(rows.length);
      let j = random.int(rows.length);
      while (Math.abs(i - j) < 2) {
        j = random.int(rows.length);
      }
      const ours = rows.map((cells, r) =>
        r === i ? [cell("OURS"), cells[1]] : cells,
      );
      const theirs = rows.map((cells, r) =>
        r === j ? [cells[0], cell("THEIRS")] : cells,
      );
      const both = rows.map((cells, r) =>
        r === i
          ? [cell("OURS"), cells[1]]
          : r === j
            ? [cells[0], cell("THEIRS")]
            : cells,
      );
      expect(
        grid(
          mergeTableContent(
            table(rows),
            table(ours),
            table(theirs),
            mergeOptions(true),
          ),
        ),
      ).toEqual(grid(table(both)));
    }
  });
});

describe("mergeTableContent: rows with equal text and a different number of cells", () => {
  // `alignRows` matches rows by `rowKey`, the texts of the cells. Before the
  // fix, the key joined the texts with "\u0000". A cell text with "\u0000"
  // then gave one cell the key of two cells: the rows matched as a stable
  // row, and `mergeCell` read the props of a missing cell (a TypeError). The
  // JSON API accepts such a text.
  it("does not throw if ours splits a cell whose text has a NUL character into two cells", () => {
    const base = table([[cell("a\u0000b")]]);
    const ours = table([[cell("a"), cell("b")]]);
    expect(
      grid(mergeTableContent(base, ours, base, mergeOptions(true))),
    ).toEqual([["a", "b"]]);
  });

  // The same key collision, without an exception: before the fix, the cell
  // "b" of theirs was lost, although ours did not change the row.
  it("keeps the cells of theirs if only theirs split a cell whose text has a NUL character", () => {
    const base = table([[cell("a\u0000b")], [cell("k")]]);
    const ours = table([[cell("a\u0000b")], [cell("k2")]]);
    const theirs = table([[cell("a"), cell("b")], [cell("k")]]);
    expect(
      grid(mergeTableContent(base, ours, theirs, mergeOptions(true))),
    ).toEqual([["a", "b"], ["k2"]]);
  });
});
