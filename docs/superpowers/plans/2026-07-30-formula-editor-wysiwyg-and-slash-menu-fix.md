# Formula Editor WYSIWYG (MathLive) + Slash Menu Scroll Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay LaTeX textarea trong modal soạn công thức của ví dụ `04-converting-blocks-from-md` bằng WYSIWYG editor (MathLive `<math-field>`) hai chế độ Cơ bản/Nâng cao, đồng thời sửa bug cuộn chuột trong slash menu (`/`) bằng CSS override cục bộ.

**Architecture:** Modal dùng React wrapper (`MathFieldWrapper`) bọc web component `<math-field>` với imperative handle. State duy nhất là LaTeX string, dùng chung cho cả 2 chế độ (Cơ bản ẩn LaTeX + palette curated; Nâng cao thêm virtual keyboard + LaTeX textarea đồng bộ 2 chiều). Slash menu scroll fix chỉ scope trong `styles.css` của ví dụ, không đụng package chung.

**Tech Stack:** React 18, TypeScript, MathLive `mathlive@^0.110`, KaTeX (giữ cho render trong editor + label palette), Vitest browser mode + vitest-browser-react.

## Global Constraints

- **Package manager:** Chỉ dùng `vp` hoặc `pnpm`. KHÔNG dùng `npm`/`yarn`. `vp run build:prod` để verify build.
- **Không đụng:** `src/schema.tsx`, `src/App.tsx`, `src/toolbar/*`, `src/markdown/*`, `src/formula/FormulaInline.tsx`, `src/formula/FormulaBlock.tsx`, `src/formula/formulaContext.tsx`, `src/formula/katexRenderer.ts`.
- **Storage format:** LaTeX string giữ nguyên (props `latex` của `formulaInline`/`formulaBlock`). Không migration.
- **Chế độ mặc định:** Modal luôn khởi tạo ở "Cơ bản". KHÔNG lưu preference vào localStorage (YAGNI).
- **Tab Toán/Hóa:** UI navigation only. KHÔNG wrap-on-commit. `inferTab(latex)` = latex chứa `\ce{` → Hóa; ngược lại Toán.
- **Slash menu fix:** CSS override chỉ trong `examples/.../src/styles.css`. KHÔNG đụng `packages/mantine/src/blocknoteStyles.css` hay bất cứ file nào ở `packages/`.
- **Data-test convention:** dùng `data-test="..."` (không phải `data-testid`) — theo pattern của core toolbar buttons.
- **Ngôn ngữ UI:** Vietnamese (giữ theo phase trước).
- **Không tạo comments giải thích what/why cho code hiển nhiên** (per CLAUDE.md).
- **KHÔNG tạo git commit trừ khi user yêu cầu.** Plan liệt kê bước "Commit" nhưng subagent-driven-development sẽ handle commits ở cuối task.

## File Structure

**Files sẽ tạo/sửa/xóa trong `examples/05-interoperability/04-converting-blocks-from-md/`:**

| Path                                 | Trạng thái | Vai trò                                                                          |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------- |
| `.bnexample.json`                    | modify     | Thêm `mathlive` dep, regen scaffolding                                           |
| `src/formula/MathFieldWrapper.tsx`   | create     | React wrapper cho `<math-field>` web component                                   |
| `src/formula/palettes.ts`            | modify     | Đổi shape `PaletteItem` (thay `snippet` bằng `insert`), thêm basic/advanced sets |
| `src/formula/insertAtCaret.ts`       | delete     | Không cần nữa (thay bằng `mathfield.executeCommand`)                             |
| `src/formula/FormulaEditorModal.tsx` | rewrite    | Layout mới, 2 chế độ, mount MathFieldWrapper, palette wiring                     |
| `src/styles.css`                     | modify     | Style cho modal mới + CSS override `.bn-suggestion-menu`                         |

**Files ở tests:**

| Path                                            | Trạng thái | Vai trò                                                                                          |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `tests/src/end-to-end/formula/formula.test.tsx` | modify     | Cập nhật selectors + browser scenarios cho math-field; thêm test mode toggle + slash-menu scroll |

**Files KHÔNG đụng (nhắc lại):** `schema.tsx`, `App.tsx`, `toolbar/*`, `markdown/*`, `FormulaInline.tsx`, `FormulaBlock.tsx`, `formulaContext.tsx`, `katexRenderer.ts`.

---

## Task 1: Add mathlive dependency + verify

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/.bnexample.json`
- Regen: scaffolding thông qua `@blocknote/dev-scripts#gen:examples`

**Interfaces:**

- Consumes: N/A (base task)
- Produces: `import 'mathlive'` khả dụng ở các task sau; `<math-field>` custom element register được ở browser env.

- [ ] **Step 1: Thêm `mathlive` dependency**

Sửa `examples/05-interoperability/04-converting-blocks-from-md/.bnexample.json`:

```json
{
  "playground": true,
  "docs": true,
  "author": "yousefed",
  "tags": ["Basic", "Blocks", "Import/Export"],
  "dependencies": {
    "katex": "^0.16.11",
    "mathlive": "^0.110.0"
  },
  "devDependencies": {
    "@types/katex": "^0.16.7"
  }
}
```

- [ ] **Step 2: Regen scaffolding cho ví dụ**

Từ repo root:

```bash
./node_modules/.bin/vp run '@blocknote/dev-scripts#gen:examples'
```

Verify:

- `examples/05-interoperability/04-converting-blocks-from-md/package.json` có `"mathlive": "^0.110.0"` trong `dependencies`.
- `playground/src/examples.gen.tsx` chứa dependency reference cho ví dụ (không cần xem chi tiết, chỉ verify không lỗi).

- [ ] **Step 3: Install**

```bash
vp install
```

Verify: `node_modules/mathlive/package.json` tồn tại.

- [ ] **Step 4: Verify build vẫn xanh**

```bash
vp run build:prod
```

Expected: PASS (chưa dùng `mathlive` ở đâu, chỉ mới add dep).

- [ ] **Step 5: Commit**

```bash
git add examples/05-interoperability/04-converting-blocks-from-md/.bnexample.json \
        examples/05-interoperability/04-converting-blocks-from-md/package.json \
        playground/src/examples.gen.tsx \
        pnpm-lock.yaml
git commit -m "chore(example): add mathlive dependency for WYSIWYG formula editor"
```

Nếu regen tạo file khác (index.html, etc.), stage cùng.

---

## Task 2: MathFieldWrapper.tsx

**Files:**

- Create: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/MathFieldWrapper.tsx`

**Interfaces:**

- Consumes: `mathlive` package (từ Task 1).
- Produces:
  - Named export `MathFieldWrapper` — `forwardRef<MathFieldHandle, MathFieldWrapperProps>`.
  - Named type export `MathFieldHandle` với shape:
    ```ts
    type MathFieldHandle = {
      insert(latex: string): void;
      focus(): void;
      getValue(): string;
      setValue(v: string): void;
    };
    ```
  - Named type export `MathFieldWrapperProps` với shape:
    ```ts
    type MathFieldWrapperProps = {
      value: string;
      onChange(v: string): void;
      virtualKeyboard?: boolean; // default: false
      readOnly?: boolean; // default: false
    };
    ```
  - Named export `sanitizePlaceholders(latex: string): string` — chuyển `\placeholder{}` → empty string, dùng khi commit.

- [ ] **Step 1: Tạo `MathFieldWrapper.tsx`**

Nội dung file:

```tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import "mathlive";

// Web component <math-field> is registered as a side-effect of importing
// 'mathlive'. TypeScript doesn't know about custom elements, so declare a
// permissive JSX intrinsic here (local — not global).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "virtual-keyboard-mode"?: "manual" | "onfocus" | "off";
          "read-only"?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

export type MathFieldHandle = {
  insert(latex: string): void;
  focus(): void;
  getValue(): string;
  setValue(v: string): void;
};

export type MathFieldWrapperProps = {
  value: string;
  onChange(v: string): void;
  virtualKeyboard?: boolean;
  readOnly?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function sanitizePlaceholders(latex: string): string {
  // Remove unfilled MathLive placeholders like \placeholder{} or \placeholder{...}
  // so downstream KaTeX rendering doesn't fail.
  return latex.replace(/\\placeholder\{[^}]*\}/g, "");
}

export const MathFieldWrapper = forwardRef<
  MathFieldHandle,
  MathFieldWrapperProps
>(function MathFieldWrapper(
  {
    value,
    onChange,
    virtualKeyboard = false,
    readOnly = false,
    style,
    className,
  },
  ref,
) {
  const mfRef = useRef<
    | (HTMLElement & {
        value: string;
        executeCommand: (cmd: any) => void;
        focus: () => void;
      })
    | null
  >(null);

  useImperativeHandle(
    ref,
    () => ({
      insert(latex) {
        const mf = mfRef.current;
        if (!mf) return;
        mf.executeCommand([
          "insert",
          latex,
          { selectionMode: "placeholder", focus: true },
        ]);
      },
      focus() {
        mfRef.current?.focus();
      },
      getValue() {
        return mfRef.current?.value ?? "";
      },
      setValue(v) {
        const mf = mfRef.current;
        if (mf && mf.value !== v) mf.value = v;
      },
    }),
    [],
  );

  // Two-way sync: push external value → math-field when it drifts.
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    if (mf.value !== value) mf.value = value;
  }, [value]);

  // Subscribe to math-field's `input` event → notify parent.
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement & { value: string };
      onChange(target.value);
    };
    mf.addEventListener("input", onInput);
    return () => mf.removeEventListener("input", onInput);
  }, [onChange]);

  return (
    <math-field
      ref={mfRef as any}
      virtual-keyboard-mode={virtualKeyboard ? "onfocus" : "off"}
      read-only={readOnly || undefined}
      style={style}
      className={className}
    />
  );
});
```

- [ ] **Step 2: Verify TypeScript compile**

```bash
vp run build:prod
```

Expected: PASS. Nếu fail vì `mathlive` types thiếu, add `@ts-expect-error` local hoặc install types.

- [ ] **Step 3: Verify web component register được (smoke test)**

Không viết test riêng cho wrapper (nó là adapter mỏng — verify qua modal ở Task 4). Chỉ verify import không throw:

```bash
grep -q "mathlive" examples/05-interoperability/04-converting-blocks-from-md/node_modules/mathlive/package.json && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add examples/05-interoperability/04-converting-blocks-from-md/src/formula/MathFieldWrapper.tsx
git commit -m "feat(example): add MathFieldWrapper for MathLive <math-field>"
```

---

## Task 3: Update palettes.ts + delete insertAtCaret.ts

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/palettes.ts`
- Delete: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/insertAtCaret.ts`

**Interfaces:**

- Consumes: N/A (leaf module).
- Produces:
  - `PaletteItem` type: `{ key: string; label: string; insert: string; tooltip: string }`. (`key` giữ cho React `key`; `label` là LaTeX render bằng KaTeX; `insert` là LaTeX chèn vào math-field — có thể dùng `#?` cho placeholder MathLive; `tooltip` là mô tả tiếng Việt.)
  - Named exports: `mathPaletteBasic`, `mathPaletteAdvanced`, `chemPaletteBasic`, `chemPaletteAdvanced` — mỗi cái là `PaletteItem[]`.

- [ ] **Step 1: Viết lại `palettes.ts`**

Ghi đè toàn bộ nội dung:

```ts
export type PaletteItem = {
  key: string;
  label: string;
  insert: string;
  tooltip: string;
};

// Basic: các cấu trúc phổ biến giáo viên hay dùng. Ưu tiên có placeholder (#?)
// để MathLive nhảy caret vào ô trống đầu tiên.
export const mathPaletteBasic: PaletteItem[] = [
  { key: "sup", label: "x^{n}", insert: "#?^{#?}", tooltip: "Lũy thừa" },
  { key: "sub", label: "x_{n}", insert: "#?_{#?}", tooltip: "Chỉ số dưới" },
  {
    key: "frac",
    label: "\\frac{a}{b}",
    insert: "\\frac{#?}{#?}",
    tooltip: "Phân số",
  },
  {
    key: "sqrt",
    label: "\\sqrt{x}",
    insert: "\\sqrt{#?}",
    tooltip: "Căn bậc hai",
  },
  {
    key: "nroot",
    label: "\\sqrt[n]{x}",
    insert: "\\sqrt[#?]{#?}",
    tooltip: "Căn bậc n",
  },
  {
    key: "int",
    label: "\\int_{a}^{b}",
    insert: "\\int_{#?}^{#?}",
    tooltip: "Tích phân",
  },
  {
    key: "sum",
    label: "\\sum_{i}^{n}",
    insert: "\\sum_{#?}^{#?}",
    tooltip: "Tổng",
  },
  {
    key: "lim",
    label: "\\lim_{x\\to a}",
    insert: "\\lim_{#? \\to #?}",
    tooltip: "Giới hạn",
  },
  { key: "alpha", label: "\\alpha", insert: "\\alpha", tooltip: "Alpha" },
  { key: "beta", label: "\\beta", insert: "\\beta", tooltip: "Beta" },
  { key: "pi", label: "\\pi", insert: "\\pi", tooltip: "Pi" },
  { key: "theta", label: "\\theta", insert: "\\theta", tooltip: "Theta" },
  { key: "infty", label: "\\infty", insert: "\\infty", tooltip: "Vô cực" },
  { key: "times", label: "\\times", insert: "\\times", tooltip: "Nhân" },
  { key: "div", label: "\\div", insert: "\\div", tooltip: "Chia" },
  { key: "pm", label: "\\pm", insert: "\\pm", tooltip: "Cộng/trừ" },
  { key: "leq", label: "\\leq", insert: "\\leq", tooltip: "≤" },
  { key: "geq", label: "\\geq", insert: "\\geq", tooltip: "≥" },
  { key: "neq", label: "\\neq", insert: "\\neq", tooltip: "≠" },
  { key: "approx", label: "\\approx", insert: "\\approx", tooltip: "Xấp xỉ" },
  { key: "arrow", label: "\\to", insert: "\\to", tooltip: "Tiến tới" },
  {
    key: "impl",
    label: "\\Rightarrow",
    insert: "\\Rightarrow",
    tooltip: "Suy ra",
  },
];

// Advanced: bổ sung các cấu trúc/ký hiệu hiếm hơn.
export const mathPaletteAdvanced: PaletteItem[] = [
  ...mathPaletteBasic,
  {
    key: "matrix2x2",
    label: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
    insert: "\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}",
    tooltip: "Ma trận 2×2",
  },
  {
    key: "cases",
    label: "\\begin{cases} \\end{cases}",
    insert:
      "\\begin{cases} #? & \\text{nếu } #? \\\\ #? & \\text{nếu } #? \\end{cases}",
    tooltip: "Hàm nhiều nhánh",
  },
  { key: "vector", label: "\\vec{v}", insert: "\\vec{#?}", tooltip: "Vector" },
  { key: "hat", label: "\\hat{x}", insert: "\\hat{#?}", tooltip: "Mũ (hat)" },
  {
    key: "bar",
    label: "\\bar{x}",
    insert: "\\bar{#?}",
    tooltip: "Gạch trên (bar)",
  },
  {
    key: "partial",
    label: "\\partial",
    insert: "\\partial",
    tooltip: "Đạo hàm riêng",
  },
  {
    key: "nabla",
    label: "\\nabla",
    insert: "\\nabla",
    tooltip: "Nabla / gradient",
  },
  { key: "forall", label: "\\forall", insert: "\\forall", tooltip: "Với mọi" },
  { key: "exists", label: "\\exists", insert: "\\exists", tooltip: "Tồn tại" },
  { key: "in", label: "\\in", insert: "\\in", tooltip: "Thuộc" },
  { key: "notin", label: "\\notin", insert: "\\notin", tooltip: "Không thuộc" },
  { key: "subset", label: "\\subset", insert: "\\subset", tooltip: "Tập con" },
  { key: "cup", label: "\\cup", insert: "\\cup", tooltip: "Hợp" },
  { key: "cap", label: "\\cap", insert: "\\cap", tooltip: "Giao" },
];

// Chem items: LUÔN wrap sẵn trong \ce{...} để render đúng khi mix với math.
export const chemPaletteBasic: PaletteItem[] = [
  { key: "h2o", label: "\\ce{H2O}", insert: "\\ce{H2O}", tooltip: "Nước" },
  {
    key: "h2so4",
    label: "\\ce{H2SO4}",
    insert: "\\ce{H2SO4}",
    tooltip: "Axit sunfuric",
  },
  { key: "co2", label: "\\ce{CO2}", insert: "\\ce{CO2}", tooltip: "CO₂" },
  { key: "nh3", label: "\\ce{NH3}", insert: "\\ce{NH3}", tooltip: "Amoniac" },
  { key: "ch4", label: "\\ce{CH4}", insert: "\\ce{CH4}", tooltip: "Metan" },
  {
    key: "nacl",
    label: "\\ce{NaCl}",
    insert: "\\ce{NaCl}",
    tooltip: "Muối ăn",
  },
  {
    key: "reaction",
    label: "\\ce{A -> B}",
    insert: "\\ce{#? -> #?}",
    tooltip: "Phản ứng (có ô trống)",
  },
  {
    key: "equil",
    label: "\\ce{A <=> B}",
    insert: "\\ce{#? <=> #?}",
    tooltip: "Cân bằng thuận nghịch",
  },
  {
    key: "gas",
    label: "\\ce{^}",
    insert: "\\ce{^}",
    tooltip: "Khí bay lên (↑)",
  },
  { key: "prec", label: "\\ce{v}", insert: "\\ce{v}", tooltip: "Kết tủa (↓)" },
];

export const chemPaletteAdvanced: PaletteItem[] = [
  ...chemPaletteBasic,
  {
    key: "heat",
    label: "\\ce{->[\\text{t}^\\circ]}",
    insert: "\\ce{#? ->[\\text{t}^\\circ] #?}",
    tooltip: "Phản ứng đun nóng",
  },
  {
    key: "cat",
    label: "\\ce{->[\\text{xt}]}",
    insert: "\\ce{#? ->[\\text{xt}] #?}",
    tooltip: "Phản ứng có xúc tác",
  },
  { key: "solid", label: "(r)", insert: "(r)", tooltip: "Trạng thái rắn" },
  { key: "liquid", label: "(l)", insert: "(l)", tooltip: "Trạng thái lỏng" },
  { key: "aq", label: "(dd)", insert: "(dd)", tooltip: "Dung dịch" },
  {
    key: "custom",
    label: "\\ce{}",
    insert: "\\ce{#?}",
    tooltip: "Bọc \\ce tuỳ chỉnh",
  },
];
```

- [ ] **Step 2: Xóa `insertAtCaret.ts`**

```bash
rm examples/05-interoperability/04-converting-blocks-from-md/src/formula/insertAtCaret.ts
```

- [ ] **Step 3: Verify không còn import nào tham chiếu**

```bash
grep -rn "insertAtCaret" examples/05-interoperability/04-converting-blocks-from-md/src tests/src 2>/dev/null
```

Expected: no output. Nếu có (VD modal cũ vẫn import), sẽ được sửa ở Task 4.

- [ ] **Step 4: Build check**

```bash
vp run build:prod
```

Expected: FAIL — vì `FormulaEditorModal.tsx` cũ vẫn dùng `insertAtCaret` + `mathPalette`/`chemPalette` (tên cũ). Đây là **expected** — Task 4 sẽ fix bằng rewrite modal. Ghi nhận và tiếp tục.

- [ ] **Step 5: Commit**

```bash
git add examples/05-interoperability/04-converting-blocks-from-md/src/formula/palettes.ts \
        examples/05-interoperability/04-converting-blocks-from-md/src/formula/insertAtCaret.ts
git commit -m "refactor(example): palette shape v2 (insert with #? placeholder) + remove insertAtCaret"
```

Note: `git add` cho file đã xóa vẫn cần thiết để stage removal.

---

## Task 4: Rewrite FormulaEditorModal.tsx

**Files:**

- Rewrite: `examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaEditorModal.tsx`

**Interfaces:**

- Consumes:
  - `MathFieldWrapper`, `MathFieldHandle`, `sanitizePlaceholders` từ `./MathFieldWrapper`.
  - `mathPaletteBasic`, `mathPaletteAdvanced`, `chemPaletteBasic`, `chemPaletteAdvanced`, `PaletteItem` từ `./palettes`.
  - `useFormulaEditor`, `useFormulaEditorState`, `FormulaTarget` từ `./formulaContext`.
  - `renderLatex` từ `./katexRenderer` (để render label palette).
- Produces:
  - Named export `FormulaEditorHandlers`:
    ```ts
    type FormulaEditorHandlers = {
      onInsert(kind: "inline" | "block", latex: string): void;
      onUpdate(target: FormulaTarget, latex: string): void;
    };
    ```
    (giữ giống cũ — App.tsx không đổi.)
  - Named export `FormulaEditorModal({ handlers })` component.

- [ ] **Step 1: Đọc `formulaContext.tsx` để nắm shape state**

```bash
cat examples/05-interoperability/04-converting-blocks-from-md/src/formula/formulaContext.tsx
```

Xác nhận `FormulaEditorState` có: `open`, `mode` (`insert` | `edit`), `initialLatex`, `initialKind`, `editTarget?`.

- [ ] **Step 2: Viết lại `FormulaEditorModal.tsx`**

Ghi đè toàn bộ nội dung:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MathFieldWrapper,
  sanitizePlaceholders,
  type MathFieldHandle,
} from "./MathFieldWrapper";
import { renderLatex } from "./katexRenderer";
import {
  useFormulaEditor,
  useFormulaEditorState,
  type FormulaTarget,
} from "./formulaContext";
import {
  mathPaletteBasic,
  mathPaletteAdvanced,
  chemPaletteBasic,
  chemPaletteAdvanced,
  type PaletteItem,
} from "./palettes";

type Tab = "math" | "chem";
type Mode = "basic" | "advanced";

function inferTab(latex: string): Tab {
  return /\\ce\{/.test(latex) ? "chem" : "math";
}

export type FormulaEditorHandlers = {
  onInsert(kind: "inline" | "block", latex: string): void;
  onUpdate(target: FormulaTarget, latex: string): void;
};

export function FormulaEditorModal({
  handlers,
}: {
  handlers: FormulaEditorHandlers;
}) {
  const state = useFormulaEditorState();
  const api = useFormulaEditor();

  const [tab, setTab] = useState<Tab>("math");
  const [mode, setMode] = useState<Mode>("basic");
  const [latex, setLatex] = useState("");
  const [kind, setKind] = useState<"inline" | "block">("inline");
  const mfRef = useRef<MathFieldHandle>(null);

  useEffect(() => {
    if (!state.open) return;
    setLatex(state.initialLatex);
    setKind(state.initialKind);
    setMode("basic");
    setTab(state.mode === "insert" ? "math" : inferTab(state.initialLatex));
  }, [state.open, state.mode, state.initialLatex, state.initialKind]);

  const items: PaletteItem[] = useMemo(() => {
    if (tab === "math")
      return mode === "basic" ? mathPaletteBasic : mathPaletteAdvanced;
    return mode === "basic" ? chemPaletteBasic : chemPaletteAdvanced;
  }, [tab, mode]);

  const isConfirmDisabled = latex.trim().length === 0;

  const insertItem = (item: PaletteItem) => {
    mfRef.current?.insert(item.insert);
  };

  const confirm = () => {
    const finalLatex = sanitizePlaceholders(latex);
    if (finalLatex.trim().length === 0) return;
    if (state.mode === "edit" && state.editTarget) {
      handlers.onUpdate(state.editTarget, finalLatex);
    } else {
      handlers.onInsert(kind, finalLatex);
    }
    api.close();
  };

  if (!state.open) return null;

  return (
    <div className="formula-modal-backdrop" onClick={api.close}>
      <div
        className="formula-modal"
        role="dialog"
        aria-label="Soạn thảo công thức"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="formula-modal-header">
          <h2>Soạn thảo công thức</h2>
          <div
            className="formula-modal-mode"
            role="tablist"
            aria-label="Chế độ"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "basic"}
              data-test="formula-mode-basic"
              onClick={() => setMode("basic")}
            >
              Cơ bản
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "advanced"}
              data-test="formula-mode-advanced"
              onClick={() => setMode("advanced")}
            >
              Nâng cao
            </button>
          </div>
          <button
            type="button"
            className="formula-modal-close"
            onClick={api.close}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="formula-modal-tabs" role="tablist" aria-label="Loại">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "math"}
            onClick={() => setTab("math")}
          >
            Toán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chem"}
            onClick={() => setTab("chem")}
          >
            Hóa
          </button>
        </div>

        <div className="formula-modal-palette" data-tab={tab} data-mode={mode}>
          {items.map((item) => {
            const glyph = renderLatex(item.label, { displayMode: false });
            return (
              <button
                key={`${tab}-${item.key}`}
                type="button"
                className="formula-palette-button"
                title={item.tooltip}
                onClick={() => insertItem(item)}
                dangerouslySetInnerHTML={{ __html: glyph.html }}
              />
            );
          })}
        </div>

        <div className="formula-modal-field">
          <MathFieldWrapper
            ref={mfRef}
            value={latex}
            onChange={setLatex}
            virtualKeyboard={mode === "advanced"}
          />
        </div>

        {mode === "advanced" && (
          <label className="formula-modal-latex">
            <span>LaTeX</span>
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              spellCheck={false}
              data-test="formula-latex-textarea"
            />
          </label>
        )}

        <div className="formula-modal-kind">
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="inline"
              checked={kind === "inline"}
              onChange={() => setKind("inline")}
              disabled={state.mode === "edit"}
            />
            Chèn trong dòng
          </label>
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="block"
              checked={kind === "block"}
              onChange={() => setKind("block")}
              disabled={state.mode === "edit"}
            />
            Chèn thành block
          </label>
        </div>

        <div className="formula-modal-actions">
          <button type="button" onClick={api.close}>
            Hủy
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            data-test="formula-confirm"
            onClick={confirm}
          >
            {state.mode === "edit" ? "Cập nhật" : "Chèn"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
vp run build:prod
```

Expected: PASS. Nếu lỗi TypeScript về JSX intrinsic `math-field`, kiểm tra `MathFieldWrapper.tsx` đã có `declare module "react" { namespace JSX { ... } }` chưa.

- [ ] **Step 4: Manual smoke (không bắt buộc chạy, nếu môi trường không có browser)**

Chạy `vp run dev`, mở ví dụ, verify:

- Modal mở ở chế độ Cơ bản mặc định.
- Click palette phân số → math-field hiện phân số với placeholder box.
- Toggle sang Nâng cao → LaTeX textarea xuất hiện dưới math-field.
- Sửa textarea → math-field cập nhật.
- Chuyển tab Hóa → palette đổi sang chemistry items.
- Confirm → block/inline xuất hiện trong editor với LaTeX đúng.

Nếu không có browser: bỏ qua step này, verify qua e2e test ở Task 6.

- [ ] **Step 5: Commit**

```bash
git add examples/05-interoperability/04-converting-blocks-from-md/src/formula/FormulaEditorModal.tsx
git commit -m "feat(example): rewrite formula modal with MathLive WYSIWYG + basic/advanced modes"
```

---

## Task 5: Update styles.css (modal + slash menu scroll fix)

**Files:**

- Modify: `examples/05-interoperability/04-converting-blocks-from-md/src/styles.css`

**Interfaces:**

- Consumes: N/A.
- Produces: CSS classes cho modal mới; CSS override cho `.bn-suggestion-menu`.

- [ ] **Step 1: Đọc `styles.css` hiện tại để giữ styles vẫn dùng**

```bash
cat examples/05-interoperability/04-converting-blocks-from-md/src/styles.css
```

Các class vẫn dùng (KHÔNG xóa): `.formula-modal-backdrop`, `.formula-modal`, `.formula-modal-header`, `.formula-modal-close`, `.formula-modal-tabs`, `.formula-modal-palette`, `.formula-palette-button`, `.formula-modal-kind`, `.formula-modal-actions`, `.formula-inline`, `.formula-block`, các CSS variables ở đầu.

Các class KHÔNG còn dùng (xóa nếu có): `.formula-modal-input` (textarea LaTeX cũ), `.formula-modal-preview`, `.formula-modal-preview-body`, `.formula-modal-error`.

- [ ] **Step 2: Sửa `styles.css`**

Trong `styles.css`:

**Xóa** các block CSS của:

- `.formula-modal-input` (nếu có)
- `.formula-modal-preview`, `.formula-modal-preview-body` (nếu có)
- `.formula-modal-error` (nếu có)

**Thêm** vào cuối file (hoặc gộp với block modal hiện có):

```css
/* Mode toggle (Cơ bản / Nâng cao) trong header modal */
.formula-modal-mode {
  display: flex;
  gap: 4px;
  margin-left: auto;
  margin-right: 12px;
}
.formula-modal-mode button {
  padding: 4px 10px;
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.formula-modal-mode button[aria-selected="true"] {
  background: #eaf2ff;
  border-color: #6ea8fe;
}

/* MathLive field container */
.formula-modal-field {
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  padding: 4px;
  background: #fff;
}
.formula-modal-field math-field {
  min-height: 64px;
  font-size: 20px;
  padding: 8px;
  display: block;
  width: 100%;
  box-sizing: border-box;
}

/* LaTeX textarea (advanced mode only) */
.formula-modal-latex {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.formula-modal-latex textarea {
  font-family:
    ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  padding: 8px;
  border: 1px solid var(--formula-modal-border);
  border-radius: 4px;
  resize: vertical;
}

/* --- Slash menu scroll fix (scope local) --- */
/* Bug package-level: .bn-suggestion-menu dùng `max-height: inherit` không
 * nhận giá trị từ inline style floating-ui đặt trên container cha, dẫn tới
 * menu không có max-height thực → wheel event xuyên xuống editor thay vì
 * scroll trong menu. Override local bằng max-height cố định. */
.bn-suggestion-menu {
  max-height: 400px;
  overflow-y: auto;
}
```

- [ ] **Step 3: Verify build**

```bash
vp run build:prod
```

Expected: PASS.

- [ ] **Step 4: Manual smoke (không bắt buộc)**

Chạy `vp run dev`, mở ví dụ:

- Kiểm tra modal mới hiện đúng: mode toggle, math-field, textarea (Nâng cao), kind, actions.
- Trong editor, gõ `/` để mở slash menu, gõ vài ký tự để filter (list dài), lăn chuột — menu phải scroll nội bộ, trang không cuộn.

- [ ] **Step 5: Commit**

```bash
git add examples/05-interoperability/04-converting-blocks-from-md/src/styles.css
git commit -m "style(example): modal layout for v2 + local .bn-suggestion-menu scroll fix"
```

---

## Task 6: Update e2e tests

**Files:**

- Modify: `tests/src/end-to-end/formula/formula.test.tsx`

**Interfaces:**

- Consumes: đã có `App` từ `@examples/.../src/App`, `preprocessMarkdown`, `postprocessBlocks`, `renderLatex` (không đổi).
- Produces: N/A (test file).

**Global test constants (mới):**

```ts
const FORMULA_BUTTON_SELECTOR = `[data-test="formula"]`;
const FORMULA_MODAL_SELECTOR = `.formula-modal`;
const FORMULA_CONFIRM_SELECTOR = `[data-test="formula-confirm"]`; // đã đổi từ data-testid → data-test ở Task 4
const FORMULA_MODE_ADV_SELECTOR = `[data-test="formula-mode-advanced"]`;
const FORMULA_LATEX_TEXTAREA = `[data-test="formula-latex-textarea"]`;
const MATH_FIELD_SELECTOR = `.formula-modal math-field`;
```

- [ ] **Step 1: Giữ các unit tests preprocess/postprocess/renderLatex**

Các block `describe("preprocessMarkdown", ...)`, `describe("postprocessBlocks", ...)`, `describe("renderLatex", ...)` giữ nguyên. KHÔNG sửa.

- [ ] **Step 2: Cập nhật constants cho selectors mới**

Trong phần đầu file, thay:

```ts
const FORMULA_CONFIRM_SELECTOR = `[data-testid="formula-confirm"]`;
```

bằng:

```ts
const FORMULA_CONFIRM_SELECTOR = `[data-test="formula-confirm"]`;
const FORMULA_MODE_ADV_SELECTOR = `[data-test="formula-mode-advanced"]`;
const FORMULA_LATEX_TEXTAREA = `[data-test="formula-latex-textarea"]`;
const MATH_FIELD_SELECTOR = `.formula-modal math-field`;
```

- [ ] **Step 3: Viết lại test "inserts an inline formula via the toolbar button"**

Thay toàn bộ nội dung test này (từ `test("inserts an inline formula...")` tới closing `});`) bằng:

```tsx
test("inserts a formula via toolbar button (advanced mode uses LaTeX textarea)", async () => {
  const trailing = await waitForSelector(
    `${EDITOR_SELECTOR} .bn-trailing-block`,
  );
  await userEvent.click(trailing);
  await userEvent.keyboard("hello world");
  await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");

  const before = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`).length;

  const button = await waitForSelector(FORMULA_BUTTON_SELECTOR);
  await userEvent.click(button);

  const modal = await waitForSelector(FORMULA_MODAL_SELECTOR);

  // Modal defaults to Basic mode: math-field present, no LaTeX textarea.
  expect(modal.querySelector(MATH_FIELD_SELECTOR)).toBeTruthy();
  expect(modal.querySelector(FORMULA_LATEX_TEXTAREA)).toBeNull();

  // Switch to Advanced mode → LaTeX textarea appears.
  await userEvent.click(await waitForSelector(FORMULA_MODE_ADV_SELECTOR));
  const textarea = (await waitForSelector(
    FORMULA_LATEX_TEXTAREA,
  )) as HTMLTextAreaElement;
  expect(textarea.value).toBe("");

  // Type LaTeX via textarea (advanced mode two-way sync).
  await userEvent.click(textarea);
  await userEvent.type(textarea, "\\frac{1}{2}");
  await sleep(150);

  // Confirm.
  const confirm = modal.querySelector(
    FORMULA_CONFIRM_SELECTOR,
  ) as HTMLButtonElement;
  expect(confirm.disabled).toBe(false);
  await userEvent.click(confirm);

  await waitForSelectorDetached(FORMULA_MODAL_SELECTOR);
  const after = document.querySelectorAll(`${EDITOR_SELECTOR} .katex`).length;
  expect(after).toBeGreaterThan(before);
});
```

- [ ] **Step 4: Viết lại test "edits an existing formula by clicking it"**

Thay toàn bộ nội dung test này bằng:

```tsx
test("edits an existing block formula (advanced mode to see raw LaTeX)", async () => {
  const blockFormulas = document.querySelectorAll<HTMLElement>(
    `${EDITOR_SELECTOR} .formula-block`,
  );
  expect(blockFormulas.length).toBeGreaterThan(0);

  await userEvent.click(blockFormulas[0]);

  const modal = await waitForSelector(FORMULA_MODAL_SELECTOR);

  // Kind is locked in edit mode.
  const blockRadio = modal.querySelector(
    'input[name="formula-kind"][value="block"]',
  ) as HTMLInputElement;
  expect(blockRadio.checked).toBe(true);
  expect(blockRadio.disabled).toBe(true);

  // Switch to Advanced to expose the LaTeX textarea, which is where we can
  // reliably assert the initial value and drive a replacement.
  await userEvent.click(await waitForSelector(FORMULA_MODE_ADV_SELECTOR));
  const textarea = (await waitForSelector(
    FORMULA_LATEX_TEXTAREA,
  )) as HTMLTextAreaElement;
  // The initial block formula is the quadratic formula from initialMarkdown.ts.
  expect(textarea.value).toContain("\\frac");

  const newLatex = "E = mc^2";
  await userEvent.click(textarea);
  await userEvent.clear(textarea);
  await userEvent.type(textarea, newLatex);
  await sleep(150);

  const confirm = modal.querySelector(
    FORMULA_CONFIRM_SELECTOR,
  ) as HTMLButtonElement;
  expect(confirm.disabled).toBe(false);
  await userEvent.click(confirm);

  await waitForSelectorDetached(FORMULA_MODAL_SELECTOR);

  // Re-open to confirm persistence.
  const updated = document.querySelectorAll<HTMLElement>(
    `${EDITOR_SELECTOR} .formula-block`,
  );
  expect(updated.length).toBe(blockFormulas.length);
  await userEvent.click(updated[0]);
  const reopened = await waitForSelector(FORMULA_MODAL_SELECTOR);
  await userEvent.click(await waitForSelector(FORMULA_MODE_ADV_SELECTOR));
  const reopenedTextarea = reopened.querySelector(
    FORMULA_LATEX_TEXTAREA,
  ) as HTMLTextAreaElement;
  expect(reopenedTextarea.value).toBe(newLatex);
});
```

- [ ] **Step 5: Giữ test "renders initial formulas from markdown template"**

Không đổi (chỉ check `.katex`, `.formula-inline`, `.formula-block` — vẫn hoạt động).

- [ ] **Step 6: Thêm test cho palette (basic mode) chèn được vào math-field**

Thêm test mới trong `describe("FormulaEditorModal (browser)", ...)`:

```tsx
test("palette click inserts LaTeX into math-field (basic mode)", async () => {
  const trailing = await waitForSelector(
    `${EDITOR_SELECTOR} .bn-trailing-block`,
  );
  await userEvent.click(trailing);
  await userEvent.keyboard("x");
  await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");

  const button = await waitForSelector(FORMULA_BUTTON_SELECTOR);
  await userEvent.click(button);

  const modal = await waitForSelector(FORMULA_MODAL_SELECTOR);
  const mathField = modal.querySelector(MATH_FIELD_SELECTOR) as any;
  expect(mathField).toBeTruthy();

  // Click the first palette button ("Lũy thừa" = x^{n} = insert "#?^{#?}").
  const firstPaletteBtn = modal.querySelector(
    ".formula-modal-palette .formula-palette-button",
  ) as HTMLButtonElement;
  expect(firstPaletteBtn).toBeTruthy();
  await userEvent.click(firstPaletteBtn);
  await sleep(100);

  // math-field.value should now contain the inserted structure. MathLive
  // may render placeholders as \placeholder{} in .value.
  expect(mathField.value).toMatch(/\^/);
});
```

- [ ] **Step 7: Thêm test cho slash menu scroll fix**

Thêm test mới ở cuối describe browser scenarios:

```tsx
test("slash menu is a scrollable container (bug fix)", async () => {
  const trailing = await waitForSelector(
    `${EDITOR_SELECTOR} .bn-trailing-block`,
  );
  await userEvent.click(trailing);
  await userEvent.keyboard("/");
  await sleep(150);

  const menu = await waitForSelector(".bn-suggestion-menu");
  const style = getComputedStyle(menu);
  // Fix mounts a fixed max-height + overflow-y:auto so wheel events scroll
  // inside the menu instead of bubbling out to the editor.
  expect(parseFloat(style.maxHeight)).toBeGreaterThan(0);
  expect(style.maxHeight).not.toBe("none");
  expect(style.overflowY).toBe("auto");
});
```

- [ ] **Step 8: Chạy tests (unit-only nếu không có browser env)**

```bash
vp run test tests/src/end-to-end/formula/formula.test.tsx
```

Expected:

- Pure-logic tests (preprocess/postprocess/renderLatex) PASS.
- Browser tests: nếu môi trường có browser (Chromium via Playwright), PASS; nếu không, có thể skip/xfail — ghi rõ trong report task.

- [ ] **Step 9: Build check**

```bash
vp run build:prod
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add tests/src/end-to-end/formula/formula.test.tsx
git commit -m "test(example): update e2e for MathLive modal + slash-menu scroll fix"
```

---

## Self-Review

**Spec coverage check:**

| Spec section                                       | Task                                            | Cover?                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| MathLive `<math-field>` wrapper                    | Task 2                                          | ✅ `MathFieldWrapper.tsx`                                                                                   |
| 2 chế độ Cơ bản/Nâng cao                           | Task 4                                          | ✅ `mode` state + conditional render                                                                        |
| Modal mặc định mở "Cơ bản"                         | Task 4 Step 2                                   | ✅ `setMode("basic")` trong useEffect init                                                                  |
| Palette curated + advanced                         | Task 3                                          | ✅ `mathPaletteBasic/Advanced`, `chemPaletteBasic/Advanced`                                                 |
| Palette click → chèn vào math-field                | Task 4 Step 2 (`insertItem`)                    | ✅ `mfRef.current?.insert(item.insert)`                                                                     |
| Virtual keyboard chỉ ở advanced                    | Task 4 Step 2                                   | ✅ `virtualKeyboard={mode === "advanced"}`                                                                  |
| LaTeX textarea 2 chiều ở advanced                  | Task 4 Step 2                                   | ✅ conditional textarea, cùng state `latex`, `onChange={setLatex}` + wrapper effect push value → math-field |
| Tab Toán/Hóa chỉ là UI navigation                  | Task 4 Step 2                                   | ✅ tab chỉ ảnh hưởng `items` array                                                                          |
| Bỏ wrap-on-commit                                  | Task 4 Step 2 (`confirm`)                       | ✅ chỉ `sanitizePlaceholders`, không wrap `\ce{...}`                                                        |
| inferTab check `\\ce{`                             | Task 4 Step 2                                   | ✅ `/\\ce\{/.test(latex)`                                                                                   |
| Sanitize `\placeholder{}` trên commit              | Task 2 (`sanitizePlaceholders`) + Task 4 Step 2 | ✅                                                                                                          |
| Slash menu CSS override local                      | Task 5 Step 2                                   | ✅ `.bn-suggestion-menu { max-height: 400px; overflow-y: auto }`                                            |
| Không đụng package chung                           | Global constraints + Task 5                     | ✅ chỉ sửa `styles.css` của ví dụ                                                                           |
| Không đụng schema, App, toolbar, markdown pipeline | Global constraints                              | ✅ không có task nào touch                                                                                  |
| E2E tests cập nhật cho UI mới                      | Task 6                                          | ✅ browser scenarios rewrite + 2 test mới                                                                   |
| Preprocess/postprocess/renderLatex tests giữ       | Task 6 Step 1                                   | ✅ nhắc rõ giữ nguyên                                                                                       |
| Data-test convention (không phải data-testid)      | Task 4 Step 2 + Task 6 Step 2                   | ✅ `data-test="formula-confirm"`, mode buttons, textarea                                                    |
| Không lưu preference localStorage (YAGNI)          | Task 4 Step 2                                   | ✅ `setMode("basic")` mỗi lần open                                                                          |
| Font MathLive tự load                              | (implicit)                                      | ⚠️ MathLive package tự bundle font — nếu build lỗi missing font, add fallback import trong Task 2           |

**Placeholder scan:** không có `TBD`/`TODO`/`fill in later`/"Add appropriate error handling" chung chung. Mỗi step có code hoặc lệnh cụ thể.

**Type consistency check:**

- `MathFieldHandle` định nghĩa Task 2 Step 1: `insert`, `focus`, `getValue`, `setValue`. Task 4 sử dụng `mfRef.current?.insert(...)` ✅ khớp.
- `PaletteItem` định nghĩa Task 3 Step 1: `{ key, label, insert, tooltip }`. Task 4 Step 2 dùng `item.insert`, `item.tooltip`, `item.key`, `item.label` ✅ khớp.
- `FormulaEditorHandlers` giữ nguyên interface cũ (`onInsert`, `onUpdate`) → `App.tsx` không đổi ✅.
- `sanitizePlaceholders(latex: string): string` từ Task 2, dùng trong Task 4 `confirm()` ✅.

**Naming consistency:**

- `mathPaletteBasic`, `mathPaletteAdvanced`, `chemPaletteBasic`, `chemPaletteAdvanced` — Task 3 định nghĩa, Task 4 import cùng tên ✅.
- `MathFieldWrapper` — Task 2 định nghĩa, Task 4 import ✅.
- `formulaContext`: không đụng, dùng lại `useFormulaEditor`, `useFormulaEditorState`, `FormulaTarget` giống phase trước ✅.
- Data-test attributes: `formula`, `formula-confirm`, `formula-mode-basic`, `formula-mode-advanced`, `formula-latex-textarea` — Task 4 định nghĩa, Task 6 dùng cùng tên ✅.

Không có gap ⇒ plan sẵn sàng thực thi.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-formula-editor-wysiwyg-and-slash-menu-fix.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
