# @blocknote/emoji-data

Trimmed, localized emoji dataset for [BlockNote](https://www.blocknotejs.org), compatible with [emoji-mart](https://github.com/missive/emoji-mart).

This package replaces `@emoji-mart/data` with a smaller, i18n-capable dataset built from [emojibase](https://emojibase.dev). It provides:

- **Emoji dataset** — ~1,900 emojis in emoji-mart's native data format, with keyword search support
- **28 locale files** — Localized category names, skin-tone labels, and UI strings, each individually importable for minimal bundle impact
- **Automatic localization** — When using BlockNote, the emoji picker automatically localizes based on the editor's `dictionary.locale`

## Installation

```bash
npm install @blocknote/emoji-data
```

> **Note:** If you're using BlockNote, this package is already included as a dependency of `@blocknote/core` — you don't need to install it separately. The emoji picker automatically uses the locale from your editor's dictionary.

## Usage

### Emoji data

```ts
import { emojiData } from "@blocknote/emoji-data";
import { init } from "emoji-mart";

await init({ data: emojiData });
```

### Loading a locale dynamically

Use `loadEmojiLocale()` to load only the locale you need at runtime:

```ts
import { emojiData, loadEmojiLocale } from "@blocknote/emoji-data";
import { init } from "emoji-mart";

const i18n = await loadEmojiLocale("fr");
await init({ data: emojiData, i18n });
```

This dynamically imports only the requested locale file (~0.5KB gzipped), not all 28.

### Importing a specific locale directly

Each locale has its own entry point:

```ts
import { fr } from "@blocknote/emoji-data/locales/fr";
```

Or import multiple from the barrel:

```ts
import { fr, de } from "@blocknote/emoji-data/locales";
```

Available locales: `bn`, `da`, `de`, `en`, `enGb`, `es`, `esMx`, `et`, `fi`, `fr`, `hi`, `hu`, `it`, `ja`, `ko`, `lt`, `ms`, `nb`, `nl`, `pl`, `pt`, `ru`, `sv`, `th`, `uk`, `vi`, `zh`, `zhHant`.

## Regenerating the data

The emoji dataset and locale files are generated from [emojibase-data](https://www.npmjs.com/package/emojibase-data) and [@emoji-mart/data](https://www.npmjs.com/package/@emoji-mart/data) (build-time only). To regenerate:

```bash
pnpm --filter @blocknote/emoji-data generate-emoji-data
```

## Bundle size

| Entry                | Raw     | Gzipped |
| -------------------- | ------- | ------- |
| Emoji data           | 280 KB  | 63 KB   |
| Single locale        | ~0.7 KB | ~0.5 KB |
| All locales (barrel) | 22 KB   | 6 KB    |

Compare to `@emoji-mart/data`: 27 MB installed, 432 KB runtime (native set).

## Types

The package exports the following types:

- `EmojiMartData` — The top-level data object (categories, emojis, aliases, sheet)
- `Emoji` — A single emoji entry (id, name, keywords, skins)
- `EmojiSkin` — A skin variant ({ native: string })
- `EmojiCategory` — A category ({ id, emojis: string[] })
- `EmojiI18n` — The i18n locale object shape
