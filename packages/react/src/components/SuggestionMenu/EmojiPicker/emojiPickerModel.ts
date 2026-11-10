import type {
  FrimousseEmoji,
  FrimousseEmojiData,
} from "@blocknote/core/emoji-data";

export const EMOJI_PICKER_COLUMNS = 9;

export type EmojiPickerRow = {
  categoryIndex: number;
  emojis: FrimousseEmoji[];
};

export type EmojiPosition = {
  row: number;
  column: number;
};

// Match Frimousse's category order and partial rows after filtering. Keeping this
// model independent of React/DOM lets keyboard navigation use the same results.
export function getEmojiPickerRows(data: FrimousseEmojiData): EmojiPickerRow[] {
  const emojisByCategory = new Map<number, FrimousseEmoji[]>();

  for (const emoji of data.emojis) {
    const categoryEmojis = emojisByCategory.get(emoji.category);
    if (categoryEmojis) {
      categoryEmojis.push(emoji);
    } else {
      emojisByCategory.set(emoji.category, [emoji]);
    }
  }

  const rows: EmojiPickerRow[] = [];
  let categoryIndex = 0;
  for (const category of data.categories) {
    const categoryEmojis = emojisByCategory.get(category.index);
    if (!categoryEmojis) {
      continue;
    }

    for (
      let index = 0;
      index < categoryEmojis.length;
      index += EMOJI_PICKER_COLUMNS
    ) {
      rows.push({
        categoryIndex,
        emojis: categoryEmojis.slice(index, index + EMOJI_PICKER_COLUMNS),
      });
    }
    categoryIndex += 1;
  }

  return rows;
}

export function filterEmojiData(data: FrimousseEmojiData, query: string) {
  if (!query) {
    return data;
  }

  // Mirror Frimousse's native search (frimousse/src/data/emoji-picker.ts) so
  // editor keyboard navigation follows the same ordering as its virtualized UI.
  const searchText = query.toLowerCase().trim();
  const matches = data.emojis
    .map((emoji) => ({
      emoji,
      score:
        (emoji.label.toLowerCase().includes(searchText) ? 10 : 0) +
        emoji.tags.filter((tag) => tag.toLowerCase().includes(searchText))
          .length,
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score);

  return {
    ...data,
    emojis: matches.map(({ emoji }) => emoji),
  };
}

export function moveEmojiPosition(
  position: EmojiPosition,
  key: "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp",
  rows: EmojiPickerRow[],
): EmojiPosition {
  const row = rows[position.row];
  if (!row) {
    return position;
  }

  switch (key) {
    case "ArrowLeft": {
      if (position.column > 0) {
        return { ...position, column: position.column - 1 };
      }
      const previousRow = rows[position.row - 1];
      return previousRow
        ? { row: position.row - 1, column: previousRow.emojis.length - 1 }
        : position;
    }
    case "ArrowRight": {
      if (position.column < row.emojis.length - 1) {
        return { ...position, column: position.column + 1 };
      }
      return rows[position.row + 1]
        ? { row: position.row + 1, column: 0 }
        : position;
    }
    case "ArrowUp":
    case "ArrowDown": {
      const rowIndex = position.row + (key === "ArrowUp" ? -1 : 1);
      const nextRow = rows[rowIndex];
      return nextRow
        ? {
            row: rowIndex,
            column: Math.min(position.column, nextRow.emojis.length - 1),
          }
        : position;
    }
  }
}
