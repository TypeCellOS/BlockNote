import { describe, expect, it } from "vite-plus/test";

import type { User } from "./UserStore.js";
import { createUserStore } from "./UserStore.js";
import {
  colorsForUserIds,
  fallbackColorForUserId,
  userColorPalette,
  userMarkColors,
} from "./userColors.js";

describe("userColorPalette", () => {
  it("contains no red", () => {
    // The palette tints insertions as well as deletions, so a red entry would
    // make one author's additions read as errors. Guard the property rather
    // than the exact hexes: red is any entry whose hue is near 0°/360°.
    for (const { light, dark } of userColorPalette) {
      for (const color of [light, dark]) {
        const [r, g, b] = [1, 3, 5].map((offset) =>
          parseInt(color.slice(offset, offset + 2), 16),
        );
        const isRed = r > g + 40 && r > b + 40;
        expect(isRed, `${color} reads as red`).toBe(false);
      }
    }
  });

  it("assigns a stable entry per user id", () => {
    expect(fallbackColorForUserId("alice")).toEqual(
      fallbackColorForUserId("alice"),
    );
    expect(userColorPalette).toContainEqual(fallbackColorForUserId("alice"));
  });
});

describe("userMarkColors", () => {
  it("is undefined for a user with no color", () => {
    expect(userMarkColors(undefined)).toBeUndefined();
    expect(userMarkColors({})).toBeUndefined();
  });

  it("uses both colors when the app supplies both", () => {
    expect(userMarkColors({ color: "#123456", colorLight: "#abcdef" })).toEqual(
      {
        light: "#abcdef",
        dark: "#123456",
      },
    );
  });

  it("derives the light tint when only `color` is set", () => {
    expect(userMarkColors({ color: "#123456" })).toEqual({
      light: "color-mix(in srgb, #123456 30%, white)",
      dark: "#123456",
    });
  });
});

describe("colorsForUserIds", () => {
  it("falls back to the first palette entry with no ids", () => {
    const store = createUserStore<User>(async () => []);
    expect(colorsForUserIds(store, undefined)).toEqual(userColorPalette[0]);
    expect(colorsForUserIds(store, [])).toEqual(userColorPalette[0]);
  });

  it("falls back to the id's palette entry for an unresolved user", () => {
    const store = createUserStore<User>(async () => []);
    expect(colorsForUserIds(store, ["alice"])).toEqual(
      fallbackColorForUserId("alice"),
    );
  });

  it("uses the resolved user's own colors, deriving the tint when needed", async () => {
    const store = createUserStore<User>(async (ids: string[]) =>
      ids.map((id) => ({
        id,
        username: id,
        avatarUrl: "",
        color: id === "both" ? "#123456" : "#654321",
        ...(id === "both" ? { colorLight: "#abcdef" } : {}),
      })),
    );
    await store.loadUsers(["both", "dark-only"]);

    expect(colorsForUserIds(store, ["both"])).toEqual({
      light: "#abcdef",
      dark: "#123456",
    });
    expect(colorsForUserIds(store, ["dark-only"])).toEqual({
      light: "color-mix(in srgb, #654321 30%, white)",
      dark: "#654321",
    });
  });
});
