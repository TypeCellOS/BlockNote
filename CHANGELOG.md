## 0.30.0 (2025-05-09)

### 🚀 Features

- expose `editor.prosemirrorState` again ([#1615](https://github.com/TypeCellOS/BlockNote/pull/1615))
- add `undo` and `redo` methods to editor API ([#1592](https://github.com/TypeCellOS/BlockNote/pull/1592))
- new auth & payment system ([#1617](https://github.com/TypeCellOS/BlockNote/pull/1617))
- re-implement Y.js collaboration as BlockNote plugins ([#1638](https://github.com/TypeCellOS/BlockNote/pull/1638))
- **file:** `previewWidth` prop now defaults to `undefined` ([#1664](https://github.com/TypeCellOS/BlockNote/pull/1664))
- **locales:** add zh-TW i18n ([#1668](https://github.com/TypeCellOS/BlockNote/pull/1668))

### 🩹 Fixes

- Formatting toolbar regression ([#1630](https://github.com/TypeCellOS/BlockNote/pull/1630))
- provide `blockId` to `uploadFile` in UploadTab ([#1641](https://github.com/TypeCellOS/BlockNote/pull/1641))
- do not close the menu on content/selection change ([#1644](https://github.com/TypeCellOS/BlockNote/pull/1644))
- keep file panel open during collaboration ([#1646](https://github.com/TypeCellOS/BlockNote/pull/1646))
- force pasting plain text into code block ([#1663](https://github.com/TypeCellOS/BlockNote/pull/1663))
- updating HTML parsing rules to account for `prosemirror-model@1.25.1` ([#1661](https://github.com/TypeCellOS/BlockNote/pull/1661))
- **code-block:** handle unknown languages better ([#1626](https://github.com/TypeCellOS/BlockNote/pull/1626))
- **locales:** add slovak i18n ([#1649](https://github.com/TypeCellOS/BlockNote/pull/1649))

### ❤️ Thank You

- l0st0 @l0st0
- Lawrence Lin @linyiru
- Matthew Lipski @matthewlipski
- Nick Perez
- Quentin Nativel

## 0.29.1 (2025-04-17)

### 🩹 Fixes

- try not to always use workspace version ([7af344ea9](https://github.com/TypeCellOS/BlockNote/commit/7af344ea9))

### ❤️ Thank You

- Nick the Sick

## 0.29.0 (2025-04-17)

### 🚀 Features

- `change` event allows getting a list of the block changed ([#1585](https://github.com/TypeCellOS/BlockNote/pull/1585))

### 🩹 Fixes

- allow opening another suggestion menu if another is triggered #1473 ([#1591](https://github.com/TypeCellOS/BlockNote/pull/1591), [#1473](https://github.com/TypeCellOS/BlockNote/issues/1473))
- add quote to schema ([aa16b15fe](https://github.com/TypeCellOS/BlockNote/commit/aa16b15fe))
- update y-prosemirror to fix #1462 ([#1608](https://github.com/TypeCellOS/BlockNote/pull/1608), [#1462](https://github.com/TypeCellOS/BlockNote/issues/1462))
- dispatch suggestion menu as a separate transaction ([#1614](https://github.com/TypeCellOS/BlockNote/pull/1614))

### ❤️ Thank You

- Nick Perez
- Nick the Sick

## 0.28.0 (2025-04-07)

### 🚀 Features

- position storage ([#1529](https://github.com/TypeCellOS/BlockNote/pull/1529))

### ❤️ Thank You

- Nick Perez

## 0.27.2 (2025-04-05)

### 🩹 Fixes

- minor update for publishing ([c2820fdac](https://github.com/TypeCellOS/BlockNote/commit/c2820fdac))

### ❤️ Thank You

- Nick the Sick

## 0.27.1 (2025-04-05)

### 🚀 Features

- **nx-cloud:** set up nx workspace ([#1586](https://github.com/TypeCellOS/BlockNote/pull/1586))

### 🩹 Fixes

- update packages to use correct react versions ([ea11ebce0](https://github.com/TypeCellOS/BlockNote/commit/ea11ebce0))

### ❤️ Thank You

- Nick Perez
- Nick the Sick

## 0.27.0 (2025-04-04)

### 🚀 Features

- split out localization files for optimized bundle ([#1533](https://github.com/TypeCellOS/BlockNote/pull/1533))
- remove shiki dep, add new @blocknote/code-block package for slim shiki build ([#1519](https://github.com/TypeCellOS/BlockNote/pull/1519))
- Block quote ([#1563](https://github.com/TypeCellOS/BlockNote/pull/1563))
- markdown pasting & custom paste handlers ([#1490](https://github.com/TypeCellOS/BlockNote/pull/1490))

### 🩹 Fixes

- Backspace in empty block deletes previous block ([#1505](https://github.com/TypeCellOS/BlockNote/pull/1505))
- Selection when clicking past end of inline content ([#1553](https://github.com/TypeCellOS/BlockNote/pull/1553))
- better expose setting a draghandlemenu's items #1525 ([#1526](https://github.com/TypeCellOS/BlockNote/pull/1526), [#1525](https://github.com/TypeCellOS/BlockNote/issues/1525))
- Multi-block links ([#1565](https://github.com/TypeCellOS/BlockNote/pull/1565))
- Hard break keyboard shortcut not working in custom blocks ([#1554](https://github.com/TypeCellOS/BlockNote/pull/1554))
- Overlapping marks in comments ([#1564](https://github.com/TypeCellOS/BlockNote/pull/1564))
- some more sentry fixes ([#1577](https://github.com/TypeCellOS/BlockNote/pull/1577))

### ❤️ Thank You

- Martinrsts @Martinrsts
- Matthew Lipski @matthewlipski
- Nick Perez

## Previous Versions

See [Github Releases](https://github.com/TypeCellOS/BlockNote/releases) for previous versions.
