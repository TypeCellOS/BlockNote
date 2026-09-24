# Package size relative to main

Compared actual `pnpm pack` tarballs from local `main` / `origin/main` at **3a37d23fc1060fb8e3222e8fb670787ddac6b071** (`fix(core): remove unused source preview anchor (#3099)`) with the current branch including its uncommitted optimizations. No remote refresh was performed. KB/MB are decimal. These are package download and unpacked sizes, excluding external dependency downloads and application bundle sizes.

| Package           | Main tarball (KB) | Current tarball (KB) | Reduction | Main unpacked (MB) | Current unpacked (MB) |
| ----------------- | ----------------: | -------------------: | --------: | -----------------: | --------------------: |
| ariakit           |              67.0 |                 37.5 |     44.1% |              0.345 |                 0.192 |
| code-block        |              15.0 |                  9.8 |     34.5% |              0.078 |                 0.042 |
| core              |           2,097.4 |              1,634.7 |     22.1% |              9.316 |                 4.695 |
| diagram-block     |           4,696.1 |                 38.1 |     99.2% |             18.608 |                 0.136 |
| mantine           |             140.9 |                 37.0 |     73.7% |              0.826 |                 0.176 |
| math-block        |             817.0 |                 41.0 |     95.0% |              8.284 |                 0.160 |
| react             |           4,208.7 |                219.5 |     94.8% |             23.604 |                 0.944 |
| server-util       |              16.9 |                 10.3 |     39.2% |              0.085 |                 0.040 |
| shadcn            |             110.5 |                 51.8 |     53.2% |              0.580 |                 0.255 |
| xl-ai             |           1,256.8 |                113.7 |     91.0% |              6.928 |                 0.463 |
| xl-ai-server      |              26.4 |                 19.3 |     26.9% |              0.099 |                 0.058 |
| xl-docx-exporter  |           1,495.6 |                605.0 |     59.5% |              3.378 |                 1.138 |
| xl-email-exporter |              67.2 |                 30.1 |     55.2% |              0.378 |                 0.115 |
| xl-multi-column   |             784.7 |                 33.4 |     95.7% |              8.275 |                 0.130 |
| xl-odt-exporter   |           1,293.0 |                397.8 |     69.2% |              3.270 |                 1.003 |
| xl-pdf-exporter   |          25,039.1 |              6,277.3 |     74.9% |             47.985 |                12.026 |
| xl-typst-compiler |           9,004.2 |              8,999.5 |      0.1% |             26.026 |                25.999 |
| xl-typst-exporter |              79.0 |                 35.5 |     55.1% |              0.270 |                 0.117 |

Across all 18 packages, including the private AI server:

- Compressed: **51.22 MB → 18.59 MB**, saving **32.62 MB (63.7%)**.
- Unpacked: **158.33 MB → 47.69 MB**, saving **110.64 MB (69.9%)**.
- Packed files: **2,557 → 1,674**.

For the 17 public packages only: **51.19 MB → 18.57 MB compressed**, and **158.23 MB → 47.63 MB unpacked**.

Core now includes this branch's localized emoji data and is still **22.1% smaller compressed** than main. Main uses external `@emoji-mart/data` and `emoji-mart` dependencies; their download sizes are outside these tarball totals. This is a net branch comparison, including other source differences from main, rather than an isolated measurement of individual optimizations.

The earlier **56.52 MB → 18.59 MB** comparison reconstructed the old packaging settings against this branch's source, including its added emoji data. It was useful for isolating packaging cleanup but was not a main comparison. The table above supersedes it when comparing this branch with main.

## Measurement method

- Built main in an isolated detached worktree with its own frozen lockfile and original build configuration. All 18 library builds passed with task caches disabled after building the shared declaration prerequisite.
- Used this branch's successfully built library artifacts and prepared README files on both sides as the publish workflow does. Temporary README preparation in the working branch was restored after packing.
- The unchanged Typst Rust output was reused after verifying all Rust source/configuration inputs and the wasm-pack version matched; its generated JS and WASM assets are identical between sides. Both package-level JS/declaration builds ran normally.
- Packed all 18 matching packages and measured the `.tgz` file bytes plus the sum of regular file sizes inside each archive. Raw results and tarballs are in `/tmp/blocknote-vs-main/`; main build logs are `/tmp/blocknote-main-build-retry.log`.
- Main ships 93.69 MB of sourcemaps and 14.28 MB of CJS files unpacked across these packages; both categories are absent from the current tarballs. Those raw byte counts are not additive compressed savings.

## Changes

- Removed CJS builds/exports and sourcemap emission from library packages.
- Excluded tests, snapshots, fixtures, test helpers, build metadata, and build-stat reports. Core packages runtime files, declarations, and fonts without its source tree.
- Emoji encoding reduced the shared payload from 11,364 to 7,367 gzip bytes (35.2%). This improvement was already present on both sides of the earlier reconstructed packaging baseline; main uses external emoji data. Locale loads also reuse promises.
- Confirmed that used `react-icons` icons are bundled. It is a development dependency; published runtime modules/declarations do not import it.
- Removed AI's direct `lodash.isequal` and `lodash.merge` dependencies and their type dependencies. Schema equality handles JSON values, including a property named `constructor`. Request composition preserves custom metadata, headers, and body fields while replacing generated document state and tool definitions. This deliberately avoids stale blocks/selections from recursive array merging and does not mutate caller-owned options.
- Applied valid e18e syntax suggestions: `.at()`, `toSorted()`, `toReversed()`, `Object.hasOwn()`, nullish assignment, exponentiation, and array/object composition. Missing values are handled explicitly where necessary.
- Aligned Floating UI and Vitest versions, then ran `pnpm dedupe`. This final dedupe reduced distinct lockfile package-version entries from 2,070 to 2,036 without introducing new package versions. Incompatible ranges, exact pins, peer environments, and workspace-link paths still require separate entries.
- Set the private AI server's `sideEffects` to `true`: its entry point starts the server and configures the global dispatcher.

The final e18e pass primarily reduces dependency requirements and workspace installation duplication. Its syntax changes have no meaningful tarball saving: combined tarball size remains approximately 18.59 MB. The large download reductions come from packaging/build cleanup. External dependencies are not included in tarball totals, so their removal must not be counted again as tarball savings. Base64 fonts remain unchanged for bundler and offline compatibility.

## Remaining e18e findings

Audited with `@e18e/cli` 0.7.0 against isolated package copies plus source. Each copy used its workspace importer projected into the lockfile root. Duplicate reports include the shared workspace lockfile and link aliases; zero install size is not an installation measurement because audit copies omit node_modules. Raw reports and validation logs are in `/tmp/blocknote-e18e-apply/` for this session.

All direct dependency replacement findings were addressed. The remaining 23 syntax file findings are false positives or non-equivalent suggestions:

- Eleven `arrayFill` suggestions match empty-array declarations but have no applicable rewrite: loops create varying values, decorations, operations, or UI elements. The CLI's own transform leaves these unchanged.
- The multi-column factory must create independent objects; `.fill(object)` would share state.
- Four sorting suggestions operate on Map iterators, which do not have `toSorted()`. Spreading and sorting the new array already makes a single copy.
- Three `.at()` suggestions target assignment destinations. Indexed assignment is required; corresponding reads were modernized.
- Three exporters combine a dynamic list of style objects with `Object.assign({}, ...stylesArray)`. The proposed spread rewrite is invalid syntax; repeated spread reduction would add allocations.
- Table-cell normalization uses `concat` to accept both arrays and scalar content. Blind spreading changes strings into characters and fails for non-iterables.

The server must retain side effects. Incompatible dependency majors were not forced together to suppress duplicate warnings.

## Validation

- All 18 library builds passed with task caches disabled.
- Core: 777 tests passed, 9 skipped. React: 13 passed.
- Targeted AI stream-tool, ProseMirror, and request tests: 72 passed, 27 skipped. Request composition and schema comparison regression tests also passed after final edits.
- Type-aware lint and frozen-lockfile installation passed.
- All 18 tarballs passed checks for excluded files, export targets, and relative runtime/declaration imports. No missing module references were found.
- Browser E2E was not run.
