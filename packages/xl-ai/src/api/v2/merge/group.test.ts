import { describe, expect, it } from "vite-plus/test";

import { BlockTree } from "../blocks/tree.js";
import type { LensBlock, LensInlineContent } from "../blocks/types.js";
import {
  connectedGroups,
  type GroupBlock,
  mergeGroupContent,
  movedTextPairs,
} from "./group.js";

function text(value: string, styles: Record<string, string | boolean> = {}) {
  return { type: "text" as const, text: value, styles };
}

function blocks(...entries: [string, ...LensInlineContent[]][]): GroupBlock[] {
  return entries.map(([id, ...content]) => ({ id, content }));
}

describe("mergeGroupContent", () => {
  it("splits the text of theirs at the new break of ours, and keeps its styles", () => {
    const merged = mergeGroupContent(
      blocks(["p", text("Alpha beta. Gamma delta.")]),
      blocks(["p", text("Alpha beta.")], ["n", text("Gamma delta.")]),
      blocks([
        "p",
        text("Alpha beta. "),
        text("Gamma", { underline: true }),
        text(" delta."),
      ]),
      {},
    );

    expect([...merged]).toEqual([
      ["p", [text("Alpha beta.")]],
      ["n", [text("Gamma", { underline: true }), text(" delta.")]],
    ]);
  });

  it("joins the texts of theirs where ours removed a break", () => {
    const merged = mergeGroupContent(
      blocks(["a", text("Alpha beta.")], ["b", text("Gamma delta.")]),
      blocks(["a", text("Alpha beta. Gamma delta.")]),
      blocks(
        ["a", text("Alpha beta.")],
        ["b", text("Gamma", { underline: true }), text(" delta.")],
      ),
      {},
    );

    expect([...merged]).toEqual([
      [
        "a",
        [
          text("Alpha beta. "),
          text("Gamma", { underline: true }),
          text(" delta."),
        ],
      ],
    ]);
  });

  it("gives a change of theirs in the moved text to the block that holds it", () => {
    const merged = mergeGroupContent(
      blocks(["p", text("Alpha beta. Gamma delta.")]),
      blocks(["p", text("Alpha beta.")], ["n", text("Gamma delta.")]),
      blocks(["p", text("Alpha beta. Gamma epsilon.")]),
      { concurrent: true },
    );

    expect([...merged]).toEqual([
      ["p", [text("Alpha beta.")]],
      ["n", [text("Gamma epsilon.")]],
    ]);
  });

  it("does not split where theirs changed the text, and gives the conflict to the block", () => {
    const conflicts: string[] = [];
    const merged = mergeGroupContent(
      blocks(["p", text("Alpha beta. Gamma delta.")]),
      blocks(["p", text("Alpha beta.")], ["n", text("Gamma delta.")]),
      blocks(["p", text("Alpha beta, gamma delta.")]),
      { concurrent: true, onConflictIn: (id) => conflicts.push(id) },
    );

    expect([...merged]).toEqual([["p", [text("Alpha beta, gamma delta.")]]]);
    expect(conflicts).toEqual(["p"]);
  });

  it("keeps a break of theirs that changed, if ours removed it", () => {
    const merged = mergeGroupContent(
      blocks(["a", text("Alpha beta.")], ["b", text("Gamma delta.")]),
      blocks(["a", text("Alpha beta. Gamma delta.")]),
      [
        { id: "a", content: [text("Alpha beta.")] },
        { id: "b", content: [text("Gamma delta.")], changed: true },
      ],
      { concurrent: true },
    );

    expect([...merged]).toEqual([
      ["a", [text("Alpha beta.")]],
      ["b", [text("Gamma delta.")]],
    ]);
  });

  it("gives a conflict of a style in the moved text to the block that holds it", () => {
    const conflicts: string[] = [];
    const merged = mergeGroupContent(
      blocks(["p", text("Alpha beta. "), text("Gamma", { textColor: "red" })]),
      blocks(
        ["p", text("Alpha beta.")],
        ["n", text("Gamma", { textColor: "blue" })],
      ),
      blocks([
        "p",
        text("Alpha beta. "),
        text("Gamma", { textColor: "green" }),
      ]),
      { concurrent: true, onConflictIn: (id) => conflicts.push(id) },
    );

    expect([...merged]).toEqual([
      ["p", [text("Alpha beta.")]],
      ["n", [text("Gamma", { textColor: "green" })]],
    ]);
    // One conflict for each character.
    expect(new Set(conflicts)).toEqual(new Set(["n"]));
  });

  it("gives the moved text to the new block of a split of theirs, also if the second part keeps the ID", () => {
    const merged = mergeGroupContent(
      blocks(["p", text("Alpha. Beta gamma delta.")]),
      blocks(["p", text("Omega. Beta gamma delta.")]),
      blocks(["n", text("Alpha.")], ["p", text("Beta gamma delta.")]),
      { concurrent: true },
    );

    expect([...merged]).toEqual([
      ["n", [text("Omega.")]],
      ["p", [text("Beta gamma delta.")]],
    ]);
  });
});

function tree(...entries: [string, string][]): BlockTree {
  return new BlockTree(
    entries.map(([id, value]): LensBlock => ({
      id,
      type: "paragraph",
      props: {},
      content: [text(value)],
      children: [],
    })),
  );
}

describe("movedTextPairs", () => {
  it("finds a split and a join, and not a replaced block", () => {
    const base = tree(
      ["p", "Alpha beta gamma. Delta epsilon zeta."],
      ["a", "Eta theta."],
      ["b", "Iota kappa lambda."],
      ["r", "Mu nu xi omicron."],
    );
    const side = tree(
      ["p", "Alpha beta gamma."],
      ["n", "Delta epsilon zeta."],
      ["a", "Eta theta. Iota kappa lambda."],
      ["r2", "Pi rho sigma tau."],
    );

    expect(movedTextPairs(base, side)).toEqual([
      ["p", "n"],
      ["b", "a"],
    ]);
  });
});

describe("connectedGroups", () => {
  it("joins the lists with an ID in common", () => {
    // The order of the groups is not a part of the result.
    expect(
      connectedGroups([["a", "b"], ["c"], ["b", "d"]])
        .map((group) => group.sort())
        .sort((x, y) => x[0].localeCompare(y[0])),
    ).toEqual([["a", "b", "d"], ["c"]]);
  });
});
