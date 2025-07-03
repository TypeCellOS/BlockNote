import { describe, expect, it } from "vitest";

import { getBlockAtPath, getBlocks } from "./Location.js";
import { Block } from "../blocks/defaultBlocks.js";

const document: Block<any, any, any>[] = [
  {
    id: "1",
    type: "paragraph",
    props: {
      textAlignment: "left",
      textColor: "default",
      backgroundColor: "default",
    },
    content: [],
    children: [
      {
        id: "2",
        type: "paragraph",
        props: {
          textAlignment: "left",
          textColor: "default",
          backgroundColor: "default",
        },
        content: [],
        children: [],
      },
    ],
  },
  {
    id: "3",
    type: "paragraph",
    props: {
      textAlignment: "left",
      textColor: "default",
      backgroundColor: "default",
    },
    content: [],
    children: [],
  },
  {
    id: "4",
    type: "paragraph",
    props: {
      textAlignment: "left",
      textColor: "default",
      backgroundColor: "default",
    },
    content: [],
    children: [
      {
        id: "5",
        type: "paragraph",
        props: {
          textAlignment: "left",
          textColor: "default",
          backgroundColor: "default",
        },
        content: [],
        children: [],
      },
      {
        id: "6",
        type: "paragraph",
        props: {
          textAlignment: "left",
          textColor: "default",
          backgroundColor: "default",
        },
        content: [],
        children: [],
      },
    ],
  },
];

describe("getBlockAtPath", () => {
  it("gets the whole document", () => {
    expect(getBlockAtPath([], document)).toEqual(document);
  });

  it("gets a block at a path", () => {
    expect(getBlockAtPath(["1", "2"], document)).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
  });

  it("gets all children of a block", () => {
    expect(getBlockAtPath(["1"], document)).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
    expect(getBlockAtPath(["4"], document)).toEqual([
      {
        id: "5",
        type: "paragraph",
        props: {
          textAlignment: "left",
          textColor: "default",
          backgroundColor: "default",
        },
        content: [],
        children: [],
      },
      {
        id: "6",
        type: "paragraph",
        props: {
          textAlignment: "left",
          textColor: "default",
          backgroundColor: "default",
        },
        content: [],
        children: [],
      },
    ]);
  });

  it("accepts block identifiers", () => {
    expect(getBlockAtPath([{ id: "1" }], document)).toEqual(
      document[0].children,
    );
    expect(getBlockAtPath([{ id: "1" }, { id: "2" }], document)).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
  });

  it("returns empty array if the path is invalid", () => {
    expect(getBlockAtPath(["1", "4"], document)).toEqual([]);
    expect(getBlockAtPath(["1", "2", "3"], document)).toEqual([]);
  });
});

describe("getBlocks", () => {
  it("gets the whole document", () => {
    expect(getBlocks([], document)).toEqual(document);
  });

  it("gets a block at a path", () => {
    expect(getBlocks(["1", "2"], document)).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
  });

  it("gets a block at a point", () => {
    expect(getBlocks({ path: ["1", "2"], offset: 0 }, document)).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
  });

  it("gets a block at a range", () => {
    expect(
      getBlocks(
        {
          head: { path: ["1", "2"], offset: 0 },
          anchor: { path: ["1", "2"], offset: 0 },
        },
        document,
      ),
    ).toEqual([
      {
        children: [],
        content: [],
        id: "2",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        type: "paragraph",
      },
    ]);
  });
});
