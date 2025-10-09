## 0.39.2 (2025-10-09)

### 🩹 Fixes

- remove prosemirror-highlight dep ([0b91964bc](https://github.com/TypeCellOS/BlockNote/commit/0b91964bc))

### ❤️ Thank You

- Nick the Sick @nperez0111

## 0.39.1-capitol-test (2025-10-09)

### 🩹 Fixes

- remove prosemirror-highlight dep ([0b91964bc](https://github.com/TypeCellOS/BlockNote/commit/0b91964bc))

### ❤️ Thank You

- Nick the Sick @nperez0111

## 0.39.1-capitol-test (2025-10-09)

### 🩹 Fixes

- remove prosemirror-highlight dep ([0b91964bc](https://github.com/TypeCellOS/BlockNote/commit/0b91964bc))

### ❤️ Thank You

- Nick the Sick @nperez0111

## 0.39.1-capitol (2025-10-09)

### 🩹 Fixes

- remove prosemirror-highlight dep ([0b91964bc](https://github.com/TypeCellOS/BlockNote/commit/0b91964bc))

### ❤️ Thank You

- Nick the Sick @nperez0111

## 0.39.1 (2025-09-19)

### 🩹 Fixes

- cleanup accesses to prosemirrorView to account for tiptap 3 behavior ([#2017](https://github.com/TypeCellOS/BlockNote/pull/2017))
- **core:** input rules can handle when a new block is empty now ([#2013](https://github.com/TypeCellOS/BlockNote/pull/2013))

### ❤️ Thank You

- Nick Perez

## 0.39.0 (2025-09-18)

### 🚀 Features

- move all blocks to use the custom blocks API ([#1904](https://github.com/TypeCellOS/BlockNote/pull/1904))
- **core:** support for Tiptap V3 ([#2001](https://github.com/TypeCellOS/BlockNote/pull/2001))

### ❤️ Thank You

- Nick Perez

## 0.38.0 (2025-09-16)

### 🚀 Features

- Custom schemas for comment editors ([#1976](https://github.com/TypeCellOS/BlockNote/pull/1976))

### 🩹 Fixes

- Suggestion menu positioning ([#1975](https://github.com/TypeCellOS/BlockNote/pull/1975))
- doLLMRequest fails when deleting a non-existent block ([#1982](https://github.com/TypeCellOS/BlockNote/pull/1982))
- file block resize handles not working with touch inputs ([#1981](https://github.com/TypeCellOS/BlockNote/pull/1981))
- get pdf example working again ([a90ae4d58](https://github.com/TypeCellOS/BlockNote/commit/a90ae4d58))
- better markdown & html paste, make methods synchronous ([#1957](https://github.com/TypeCellOS/BlockNote/pull/1957))
- Improve setting text for custom file blocks ([#1984](https://github.com/TypeCellOS/BlockNote/pull/1984))
- **react:** close link popover on submit in static formatting toolbar #1696 ([#1997](https://github.com/TypeCellOS/BlockNote/pull/1997), [#1696](https://github.com/TypeCellOS/BlockNote/issues/1696))

### ❤️ Thank You

- dsriva03 @dsriva03
- Héctor Zhuang @Hector-Zhuang
- Matthew Lipski @matthewlipski
- Nick the Sick

## 0.37.0 (2025-08-29)

### 🚀 Features

- export `ShadCNComponentsContext` ([#1965](https://github.com/TypeCellOS/BlockNote/pull/1965))

### 🩹 Fixes

- Typing in empty table cells ([#1973](https://github.com/TypeCellOS/BlockNote/pull/1973))

### ❤️ Thank You

- Héctor Zhuang @Hector-Zhuang
- Matthew Lipski @matthewlipski

## 0.36.1 (2025-08-27)

### 🩹 Fixes

- table column widths not being set in exported HTML ([#1947](https://github.com/TypeCellOS/BlockNote/pull/1947))
- Minor change to formatting toolbar extension logic ([#1963](https://github.com/TypeCellOS/BlockNote/pull/1963))
- **core:** report block moves in `getBlocksChangedByTransaction` #1924 ([#1960](https://github.com/TypeCellOS/BlockNote/pull/1960), [#1924](https://github.com/TypeCellOS/BlockNote/issues/1924))

### ❤️ Thank You

- Matthew Lipski @matthewlipski
- Nick Perez

## 0.36.0 (2025-08-25)

### 🚀 Features

- **docx:** add locale configuration for docx export ([#1937](https://github.com/TypeCellOS/BlockNote/pull/1937))

### 🩹 Fixes

- Editors in comments not inheriting theme ([#1890](https://github.com/TypeCellOS/BlockNote/pull/1890))
- Minor drag & drop changes ([#1891](https://github.com/TypeCellOS/BlockNote/pull/1891))
- Overflow on table blocks ([#1892](https://github.com/TypeCellOS/BlockNote/pull/1892))
- Suggestion menu closing when clicking scroll bar ([#1899](https://github.com/TypeCellOS/BlockNote/pull/1899))
- Table padding ([#1906](https://github.com/TypeCellOS/BlockNote/pull/1906))
- Formatting toolbar getting wrong bounding box when updating React inline content ([#1908](https://github.com/TypeCellOS/BlockNote/pull/1908))
- Vanilla blocks return true for editor.isEditable on initial render ([#1925](https://github.com/TypeCellOS/BlockNote/pull/1925))
- table cell menu styling ([#1945](https://github.com/TypeCellOS/BlockNote/pull/1945))
- Missing internationalization for toggle wrapper ([#1946](https://github.com/TypeCellOS/BlockNote/pull/1946))
- parse image alt text for image blocks ([#1883](https://github.com/TypeCellOS/BlockNote/pull/1883))
- initialize esm deps before copy extension uses it ([#1951](https://github.com/TypeCellOS/BlockNote/pull/1951))
- error when dragging a block from one editor to another with multiple column extension ([#1950](https://github.com/TypeCellOS/BlockNote/pull/1950))
- prevent infinite render loop when selecting all content ([#1956](https://github.com/TypeCellOS/BlockNote/pull/1956))
- **core:** maintain text selection across table updates ([#1894](https://github.com/TypeCellOS/BlockNote/pull/1894))
- **locales:** ko locale fix ([#1902](https://github.com/TypeCellOS/BlockNote/pull/1902))
- **react:** add data attribute for correct react rendering ([#1954](https://github.com/TypeCellOS/BlockNote/pull/1954))
- **xl-email-exporter:** better defaults, customize textStyles, output inline styles ([#1856](https://github.com/TypeCellOS/BlockNote/pull/1856))

### ❤️ Thank You

- Brad Greenlee
- Cyril G @Ovgodd
- Héctor Zhuang @Hector-Zhuang
- Matthew Lipski @matthewlipski
- Nick Perez
- Nick the Sick

## 0.35.0 (2025-07-25)

### 🚀 Features

- use fumadocs for website ([#1654](https://github.com/TypeCellOS/BlockNote/pull/1654))
- llms.mdx routes ([cea93840e](https://github.com/TypeCellOS/BlockNote/commit/cea93840e))

### 🩹 Fixes

- insert file upload before block if it is closer to the top of the block ([#1857](https://github.com/TypeCellOS/BlockNote/pull/1857))
- rename albert model ([3b0ba8d25](https://github.com/TypeCellOS/BlockNote/commit/3b0ba8d25))
- resolve some minor drag & drop regressions ([#1862](https://github.com/TypeCellOS/BlockNote/pull/1862))
- blockquote HTML parsing #1762 ([#1877](https://github.com/TypeCellOS/BlockNote/pull/1877), [#1762](https://github.com/TypeCellOS/BlockNote/issues/1762))

### ❤️ Thank You

- Brad Greenlee
- Nick Perez
- Nick the Sick
- yousefed

## 0.34.0 (2025-07-17)

### 🚀 Features

- support multi-column block in PDF, DOCX & ODT exporters ([#1781](https://github.com/TypeCellOS/BlockNote/pull/1781))
- support react 19 ([f7b3466d3](https://github.com/TypeCellOS/BlockNote/commit/f7b3466d3))
- disable conversion of headings to list items ([#1799](https://github.com/TypeCellOS/BlockNote/pull/1799))
- report `moves` (indents and outdents) as changes when using `getChanges` #1757 ([#1786](https://github.com/TypeCellOS/BlockNote/pull/1786), [#1757](https://github.com/TypeCellOS/BlockNote/issues/1757))
- allow inline content to be `draggable` ([#1818](https://github.com/TypeCellOS/BlockNote/pull/1818))
- added type guards, types, and `editor` prop to custom inline content rendering ([#1736](https://github.com/TypeCellOS/BlockNote/pull/1736))
- **block-change:** adds a new API for blocking changes to editor state, by filtering transactions ([#1750](https://github.com/TypeCellOS/BlockNote/pull/1750))

### 🩹 Fixes

- remove lookbehind regex for browser compat ([#1827](https://github.com/TypeCellOS/BlockNote/pull/1827))
- `ToggleWrapper` button defaulting to `submit` type ([#1823](https://github.com/TypeCellOS/BlockNote/pull/1823))
- disable $ref in AI schemas (html format) ([#1819](https://github.com/TypeCellOS/BlockNote/pull/1819))
- re-evaluate side-menu on scroll ([#1830](https://github.com/TypeCellOS/BlockNote/pull/1830))
- hide table extend buttons when not editable #1848 ([#1850](https://github.com/TypeCellOS/BlockNote/pull/1850), [#1848](https://github.com/TypeCellOS/BlockNote/issues/1848))
- resolve several drag & drop issues ([#1845](https://github.com/TypeCellOS/BlockNote/pull/1845))

### ❤️ Thank You

- Arek Nawo @areknawo
- Gonçalo Basto @gbasto
- Héctor Zhuang @Hector-Zhuang
- Matthew Lipski @matthewlipski
- Nick Perez
- Nick the Sick @nperez0111
- Yousef

## 0.33.0 (2025-07-03)

### 🚀 Features

- FloatingUI options prop for `BlockPositioner` ([#1801](https://github.com/TypeCellOS/BlockNote/pull/1801))
- Support Google Gemini AI ([#1805](https://github.com/TypeCellOS/BlockNote/pull/1805))

### 🩹 Fixes

- support multi-character suggestions ([#1734](https://github.com/TypeCellOS/BlockNote/pull/1734))
- switch foreground color based on selected user color dynamically #1785 ([#1787](https://github.com/TypeCellOS/BlockNote/pull/1787), [#1785](https://github.com/TypeCellOS/BlockNote/issues/1785))
- mark react package as external in email exporter ([#1807](https://github.com/TypeCellOS/BlockNote/pull/1807))
- Duplicate `formatConversionTest` files ([#1798](https://github.com/TypeCellOS/BlockNote/pull/1798))
- AI empty document handling ([#1810](https://github.com/TypeCellOS/BlockNote/pull/1810))
- `bn-inline-content` class name getting duplicated ([#1794](https://github.com/TypeCellOS/BlockNote/pull/1794))

### ❤️ Thank You

- Matthew Lipski @matthewlipski
- Nick Perez
- Yousef

## 0.32.0 (2025-06-24)

### 🚀 Features

- toggle blocks ([#1707](https://github.com/TypeCellOS/BlockNote/pull/1707))
- **core:** support h4, h5, and h6 ([#1634](https://github.com/TypeCellOS/BlockNote/pull/1634))
- **xl-email-exporter:** add email exporter ([#1768](https://github.com/TypeCellOS/BlockNote/pull/1768))

### 🩹 Fixes

- react 19 strict mode compatibility ([#1726](https://github.com/TypeCellOS/BlockNote/pull/1726))
- add keys to pdf exporter ([#1739](https://github.com/TypeCellOS/BlockNote/pull/1739))
- only listten for left click on formatting toolbar ([#1774](https://github.com/TypeCellOS/BlockNote/pull/1774))
- prevent formatting toolbar from closing if click was from inside the editor ([#1775](https://github.com/TypeCellOS/BlockNote/pull/1775))
- **locales:** add Hebrew translations for various components ([#1779](https://github.com/TypeCellOS/BlockNote/pull/1779))

### ❤️ Thank You

- Aslam @Aslam97
- Drew Johnson
- Jonathan Marbutt @jmarbutt
- Matthew Lipski @matthewlipski
- Nick Perez
- Samuel Bisberg
- Yousef

## 0.31.3 (2025-06-18)

### 🩹 Fixes

- AI generation with empty document ([#1740](https://github.com/TypeCellOS/BlockNote/pull/1740))
- do not send a welcome email if magic link was used on an account older than a minute ago ([db88fe4aa](https://github.com/TypeCellOS/BlockNote/commit/db88fe4aa))
- AI system messages should always be at start of prompt ([#1741](https://github.com/TypeCellOS/BlockNote/pull/1741))
- Selection clicking editor padding ([#1717](https://github.com/TypeCellOS/BlockNote/pull/1717))
- preserve marks across a shift+enter #1672 ([#1743](https://github.com/TypeCellOS/BlockNote/pull/1743), [#1672](https://github.com/TypeCellOS/BlockNote/issues/1672))
- **ai:** undo-redo after accepting/rejecting changes will undo as expected ([#1752](https://github.com/TypeCellOS/BlockNote/pull/1752))
- **locales:** add translations for some comment strings ([#1764](https://github.com/TypeCellOS/BlockNote/pull/1764))
- **website:** log in bug fixes ([#1742](https://github.com/TypeCellOS/BlockNote/pull/1742))

### ❤️ Thank You

- Matthew Lipski @matthewlipski
- Nick Perez
- Nick the Sick
- Vinicius Fernandes @ViniCleFer
- Yousef

## 0.31.2 (2025-06-05)

### 🩹 Fixes

- re-release ([0bc546e18](https://github.com/TypeCellOS/BlockNote/commit/0bc546e18))
- ignore falsy values in boolean prop schema ([#1730](https://github.com/TypeCellOS/BlockNote/pull/1730))

### ❤️ Thank You

- Nick Perez
- Nick the Sick

## 0.31.1 (2025-05-23)

### 🩹 Fixes

- backwards-compat for `_extensions` ([#1708](https://github.com/TypeCellOS/BlockNote/pull/1708))

### ❤️ Thank You

- Nick Perez

## 0.31.0 (2025-05-20)

### 🩹 Fixes

- Playwright flaky keyboard handler test ([#1704](https://github.com/TypeCellOS/BlockNote/pull/1704))

### ❤️ Thank You

- Matthew Lipski @matthewlipski

## 0.30.1 (2025-05-20)

### 🩹 Fixes

- better type-safety ([678086d4d](https://github.com/TypeCellOS/BlockNote/commit/678086d4d))
- do not use `editor.dispatch` ([#1698](https://github.com/TypeCellOS/BlockNote/pull/1698))
- re-added `display: flex` to blocks without inline content ([#1702](https://github.com/TypeCellOS/BlockNote/pull/1702))
- **react:** add missing exports ([#1689](https://github.com/TypeCellOS/BlockNote/pull/1689))

### ❤️ Thank You

- Matthew Lipski @matthewlipski
- Nick Perez
- Nick the Sick

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
