# Formula Editor WYSIWYG (MathLive) + Slash Menu Scroll Fix — Design

**Ngày:** 2026-07-30
**Ngữ cảnh:** Ví dụ `examples/05-interoperability/04-converting-blocks-from-md/`
**Branch nền tảng:** `feat/formula-editor-md-example` (đã build sẵn LaTeX-based modal ở phần 1 của feature)

## Vấn đề

1. **Modal soạn công thức hiện tại yêu cầu người dùng gõ LaTeX thô.** Với giáo viên phổ thông ít rành tech, LaTeX là rào cản. Cần một chế độ WYSIWYG (giống MathType) hiển thị ô trống điền vào — người dùng thấy công thức đang xây trực tiếp, không thấy cú pháp LaTeX.

2. **Bug slash menu (`/`):** Khi menu có nhiều item hơn chiều cao vừa vặn, cuộn chuột trong menu bị "thấm" xuống trang / editor thay vì cuộn danh sách item. Xác nhận qua CSS: `.bn-suggestion-menu` khai báo `max-height: inherit` (`packages/mantine/src/blocknoteStyles.css:330`), nhưng floating-ui đặt `maxHeight` bằng **inline style** trên phần tử floating cha, và `inherit` không nhận giá trị từ inline style theo cách kỳ vọng — dẫn đến menu không có max-height thực, không thành scroll container, wheel event xuyên qua xuống nội dung dưới.

## Mục tiêu

- Người dùng không cần biết LaTeX vẫn soạn được các công thức phổ biến (√, phân số, mũ, lũy thừa, tích phân, tổng, giới hạn, ký tự Hy Lạp, so sánh, mũi tên, phản ứng hóa cơ bản).
- Người dùng chuyên sâu vẫn có đầy đủ sức mạnh MathLive khi cần công thức hiếm/phức tạp.
- Nội dung không đổi định dạng lưu (vẫn LaTeX string qua `formulaInline`/`formulaBlock` props).
- Slash menu (`/`) cuộn được bằng chuột trong nội bộ menu, không thấm ra ngoài.

## Phi mục tiêu

- Không xây engine WYSIWYG math riêng.
- Không đổi định dạng lưu (vẫn `latex` string).
- Không đụng markdown pipeline (`preprocessMarkdown`/`postprocessBlocks`).
- Không đụng `formulaInline`/`formulaBlock` schema — chỉ modal thay.
- Không sửa bug slash menu ở tầng package chung (chỉ scope ví dụ này qua CSS override). Bug package-level ghi làm follow-up.
- Không thêm tính năng lưu chế độ ưu tiên vào localStorage (YAGNI).

## Kiến trúc tổng thể

### Thư viện

**Chọn:** [MathLive](https://cortexjs.io/mathlive/) qua npm package `mathlive`.

- Web component `<math-field>` — WYSIWYG editor cho công thức toán học và hóa học (qua `\ce{...}`).
- I/O 2 chiều là **LaTeX string** → tương thích 100% với hiện trạng (props `latex` của `formulaInline`/`formulaBlock` không đổi).
- Có virtual keyboard (tắt mặc định, chỉ bật ở chế độ Nâng cao).
- Có API imperative để chèn snippet tại caret: `mathfield.executeCommand(['insert', latex])`.

**Đã loại:**

- MathType Web (license thương mại).
- Tự xây tokenizer trên KaTeX (quá tốn công cho scope ví dụ).

**Cost:** MathLive ~100 KB gzipped + font riêng. Chấp nhận được vì đây là ví dụ minh họa tính năng cốt lõi.

### Chế độ UI

Modal có **2 chế độ**, cùng chia sẻ 1 instance `<math-field>` bên trong (chuyển chế độ giữ nguyên nội dung):

#### Chế độ "Cơ bản" (mặc định)

Dành cho giáo viên ít rành tech. Ẩn hoàn toàn LaTeX.

Layout:

```
┌───────────────────────────────────────────────┐
│ Soạn thảo công thức    [ Cơ bản | Nâng cao ]× │
├───────────────────────────────────────────────┤
│ [Toán] [Hóa]                                  │
├───────────────────────────────────────────────┤
│ Palette curated (khoảng 24-32 nút phổ biến):  │
│  [x²] [xₙ] [a/b] [√x] [ⁿ√x] [∫] [Σ] [lim]     │
│  [α]  [β]  [π]   [θ]  [∞]   [×] [÷] [±]       │
│  [≤]  [≥]  [≠]   [≈]  [⇒]   [→]               │
├───────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐ │
│ │   <math-field> (hiển thị công thức đang   │ │
│ │    xây, click ô trống để điền)            │ │
│ └───────────────────────────────────────────┘ │
├───────────────────────────────────────────────┤
│ ( ) Chèn trong dòng   (•) Chèn thành block    │
├───────────────────────────────────────────────┤
│                       [Hủy]    [Chèn/Cập nhật]│
└───────────────────────────────────────────────┘
```

Đặc điểm:

- `<math-field>` với `virtual-keyboard-mode="off"` và không hiện toolbar mặc định của MathLive.
- KHÔNG hiện raw LaTeX textarea.
- Palette curated: mỗi nút chèn structure (có placeholder box) hoặc symbol trực tiếp vào math-field tại caret.
- Không có nút toggle virtual keyboard.

#### Chế độ "Nâng cao"

Dành cho công thức hiếm/phức tạp không có trong palette cơ bản.

Layout: giống Cơ bản NHƯNG bổ sung:

- Palette đầy đủ hơn (thêm khoảng 20-30 symbol hiếm).
- Nút "⌨ Bàn phím" bật/tắt virtual keyboard của MathLive.
- Vùng "LaTeX" hiện dưới math-field: `<textarea>` đồng bộ 2 chiều với math-field.
  - Sửa math-field → textarea cập nhật (qua sự kiện `input` của math-field).
  - Sửa textarea → math-field cập nhật (set `mathfield.value`).
  - Đồng bộ theo debounce ngắn (100ms) để tránh loop.

Chuyển chế độ (nút toggle ở header):

- Cả 2 chế độ đọc/ghi cùng 1 giá trị LaTeX (state React duy nhất).
- Chuyển chế độ = re-render với chế độ mới, LaTeX preserved.
- Không mất caret position là không bắt buộc (best-effort — MathLive giữ nếu re-render không thay math-field DOM).
- Mặc định luôn mở ở "Cơ bản" khi modal khởi tạo lại (không nhớ chế độ trước, YAGNI).

### Tab Toán / Hóa — đơn giản hóa

**Đổi so với phase trước:** bỏ hoàn toàn logic "wrap-on-commit" cho tab Hóa (nó gây double-wrap khi user mix nhiều biểu thức).

Semantics mới:

- Tab chỉ là **UI navigation** để chọn palette hiển thị (Toán palette vs Hóa palette). Không tác động tới LaTeX được lưu.
- **Toán palette:** items là LaTeX thuần (`\frac{#?}{#?}`, `\sqrt{#?}`, `\alpha`, ...).
- **Hóa palette:** items là `\ce{...}` **wrapped sẵn** (`\ce{H2O}`, `\ce{->}`, `\ce{<=>}`, ...). Khi user click, chèn nguyên đoạn `\ce{...}` vào math-field.
- User có thể mix: math-field content có thể là `\ce{H2O} + 5x` — hợp lệ với MathLive/KaTeX + mhchem.
- Commit lưu math-field value nguyên vẹn.
- **inferTab khi edit:** kiểm tra chuỗi có chứa bất kỳ `\ce{` nào → Hóa; không có → Toán. (Đơn giản hơn regex `^\ce{...}$` cũ.)

Rendering trong math-field: MathLive tự xử lý `\ce{...}` như một macro hợp lệ (mhchem tương thích). Không cần config đặc biệt.

### Palette hoạt động thế nào

Mỗi palette item có dạng:

```
{
  label: string,         // hiển thị (render bằng KaTeX như hiện tại)
  insert: string,        // LaTeX string chèn vào math-field
  cursor?: 'first' | 'end',  // vị trí caret sau chèn (mặc định: first placeholder)
  mode?: 'math' | 'chem'     // ràng buộc tab
}
```

Khi click:

```javascript
mathfield.executeCommand([
  "insert",
  item.insert,
  {
    selectionMode: "placeholder", // đặt caret vào #? placeholder đầu tiên
    focus: true,
  },
]);
```

MathLive dùng `#?` làm placeholder token trong string chèn. Ví dụ: `\frac{#?}{#?}` sẽ tạo phân số với ô trống, caret nhảy vào tử số.

### Fix slash menu scroll (scope local)

Trong `styles.css` của ví dụ, thêm CSS override:

```css
.bn-suggestion-menu {
  max-height: 400px;
  overflow-y: auto;
}
```

Không đụng package chung. Verify bằng cách mở menu, kéo dài query để có nhiều item, dùng chuột cuộn — menu phải cuộn nội bộ, không thấm ra editor.

**Follow-up (ngoài scope):** Ghi 1 comment/issue mô tả bug package-level và cách sửa đề xuất (đặt inline `maxHeight` trên chính `.bn-suggestion-menu` thay vì floating container, hoặc đổi `inherit` → `100%` không hoạt động do parent không có max-height explicit). Sẽ được ghi trong ledger, không phải part của PR này.

## Cấu trúc file

Files mới hoặc đổi trong `examples/05-interoperability/04-converting-blocks-from-md/`:

| File                                                | Trạng thái | Vai trò                                                              |
| --------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `.bnexample.json`                                   | sửa        | Thêm dependency `mathlive`                                           |
| `src/formula/FormulaEditorModal.tsx`                | viết lại   | Layout mới, host math-field, mode toggle                             |
| `src/formula/MathFieldWrapper.tsx`                  | mới        | React wrapper cho `<math-field>` web component                       |
| `src/formula/palettes.ts`                           | sửa        | Đổi shape của `PaletteItem` (thêm `insert`), thêm items nâng cao     |
| `src/formula/insertAtCaret.ts`                      | xóa        | Thay bằng `mathfield.executeCommand`                                 |
| `src/formula/formulaContext.tsx`                    | không đổi  | Interface mở modal không đổi                                         |
| `src/formula/katexRenderer.ts`                      | không đổi  | Vẫn dùng cho render palette label và render trong editor             |
| `src/formula/FormulaInline.tsx`, `FormulaBlock.tsx` | không đổi  | Render trong editor vẫn dùng KaTeX (nhẹ, chỉ đọc)                    |
| `src/styles.css`                                    | sửa        | Style cho modal mới + CSS override cho `.bn-suggestion-menu`         |
| `src/markdown/*`                                    | không đổi  | Pipeline không đổi                                                   |
| `src/schema.tsx`, `src/App.tsx`                     | không đổi  | Schema không đổi                                                     |
| `src/toolbar/*`                                     | không đổi  | Trigger từ toolbar không đổi                                         |
| `tests/src/end-to-end/formula/*`                    | cập nhật   | Tests browser cần đổi selector cho math-field thay vì textarea LaTeX |

### `MathFieldWrapper.tsx` (bản phác)

```tsx
// Wrapper React cho <math-field> web component. Quản lý:
// - Lifecycle (register MathLive khi mount lần đầu)
// - Sync giá trị 2 chiều với React state
// - Expose ref imperative để palette gọi executeCommand
// - Cấu hình virtual keyboard theo prop
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import "mathlive"; // side-effect: registers <math-field> custom element

export type MathFieldHandle = {
  insert(latex: string): void;
  focus(): void;
  getValue(): string;
  setValue(v: string): void;
};

export const MathFieldWrapper = forwardRef<
  MathFieldHandle,
  {
    value: string;
    onChange(v: string): void;
    virtualKeyboard?: boolean; // default: false
  }
>(({ value, onChange, virtualKeyboard = false }, ref) => {
  const mfRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    insert(latex) {
      mfRef.current?.executeCommand([
        "insert",
        latex,
        {
          selectionMode: "placeholder",
          focus: true,
        },
      ]);
    },
    focus: () => mfRef.current?.focus(),
    getValue: () => mfRef.current?.value ?? "",
    setValue: (v) => {
      if (mfRef.current) mfRef.current.value = v;
    },
  }));

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    if (mf.value !== value) mf.value = value;
  }, [value]);

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    const onInput = (e: any) => onChange(e.target.value);
    mf.addEventListener("input", onInput);
    return () => mf.removeEventListener("input", onInput);
  }, [onChange]);

  return (
    <math-field
      ref={mfRef}
      virtual-keyboard-mode={virtualKeyboard ? "onfocus" : "off"}
      style={{ minHeight: 64, fontSize: 20, padding: 8 }}
    />
  );
});
```

### Palette item shape mới

```ts
export type PaletteItem = {
  key: string; // unique per palette
  label: string; // LaTeX render trên nút (dùng KaTeX)
  insert: string; // LaTeX chèn vào math-field (dùng #? cho placeholder)
  tooltip: string;
};

// Ví dụ:
export const mathPaletteBasic: PaletteItem[] = [
  { key: "sup", label: "x^{n}", insert: "#?^{#?}", tooltip: "Lũy thừa" },
  {
    key: "frac",
    label: "\\frac{a}{b}",
    insert: "\\frac{#?}{#?}",
    tooltip: "Phân số",
  },
  { key: "sqrt", label: "\\sqrt{x}", insert: "\\sqrt{#?}", tooltip: "Căn" },
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
  { key: "alpha", label: "\\alpha", insert: "\\alpha", tooltip: "Alpha" },
  // ...
];

export const mathPaletteAdvanced: PaletteItem[] = [
  ...mathPaletteBasic,
  // Thêm ~20-30 items hiếm: matrix, cases, vector, partial, nabla, ...
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
  {
    key: "arrow",
    label: "\\ce{->}",
    insert: "\\ce{#? -> #?}",
    tooltip: "Mũi tên phản ứng (với ô trống)",
  },
  {
    key: "equil",
    label: "\\ce{<=>}",
    insert: "\\ce{#? <=> #?}",
    tooltip: "Cân bằng (với ô trống)",
  },
  { key: "plus", label: "+", insert: "+", tooltip: "Cộng (ngoài \\ce)" },
  // ...
];
```

## Data flow

```
User mở modal (từ toolbar hoặc slash)
       ↓
formulaContext.state = {open: true, initialLatex, initialKind, mode, editTarget?}
       ↓
FormulaEditorModal khởi tạo:
  - mode UI = 'basic' (mặc định)
  - latex state = state.initialLatex
  - kind state = state.initialKind
  - tab = inferTab(initialLatex)
       ↓
Render:
  - Header + toggle mode
  - Tabs Toán/Hóa
  - Palette (basic hoặc advanced tùy mode)
  - <MathFieldWrapper value={latex} onChange={setLatex} virtualKeyboard={mode==='advanced'}/>
  - (advanced only) <textarea value={latex} onChange={setLatex}/>
  - Kind radios
  - Hủy / Chèn
       ↓
Click palette item → mathfieldRef.current.insert(item.insert)
       ↓
math-field 'input' event → setLatex(newValue)
       ↓
(advanced) textarea sync theo latex state
       ↓
Click Chèn:
  - if state.mode === 'edit' → handlers.onUpdate(editTarget, latex)
  - else → handlers.onInsert(kind, latex)   ← không wrap, lưu nguyên vẹn
  - api.close()
```

## Xử lý lỗi

- **MathLive load fail:** wrapper fallback về thông báo "Không thể tải editor. Vui lòng tải lại trang." Không có fallback về textarea LaTeX (giữ code đơn giản; là ví dụ không phải prod).
- **LaTeX không hợp lệ (chỉ có ở chế độ Nâng cao khi sửa raw):** math-field sẽ render best-effort (có thể hiện đỏ). Nút Chèn vẫn cho phép — người dùng chịu trách nhiệm. Không validate ngặt.
- **Empty:** nút Chèn disable khi `latex.trim() === ''`.

## Kiểm thử

Unit test (Vitest browser mode, cùng file `tests/src/end-to-end/formula/formula.test.tsx`):

1. Modal mở ở chế độ Cơ bản mặc định.
2. Click palette "phân số" → math-field có `\frac{#?}{#?}` (assert qua wrapper handle `getValue()`).
3. Chuyển sang Nâng cao → textarea LaTeX xuất hiện, giá trị khớp math-field.
4. Sửa textarea → math-field cập nhật (đồng bộ 2 chiều).
5. Chuyển tab Hóa → click palette H2O → math-field có `\ce{H2O}`.
6. Chèn thành công → block/inline xuất hiện với đúng LaTeX.
7. Bug slash-menu scroll: mở menu, resize/query để list dài, cuộn chuột trong menu — assert `scrollTop` menu tăng và trang không cuộn.

Test cũ với `<textarea>` LaTeX cần cập nhật selector; test preprocess/postprocess/renderLatex giữ nguyên.

## Rủi ro & giảm thiểu

| Rủi ro                                                                   | Giảm thiểu                                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| MathLive không tương thích React SSR/vite bundling                       | Import lazy nếu cần; ví dụ chạy client-only nên rủi ro thấp                                               |
| Web component không nhận React ref chuẩn                                 | Dùng `ref` gán trực tiếp lên phần tử DOM và imperative API                                                |
| Font MathLive thiếu → math-field hiện thị lỗi                            | Import CSS của mathlive: `import 'mathlive/dist/mathlive-static.css'` (nếu có) hoặc `mathlive/static.css` |
| Bug wheel scroll xảy ra ở nhiều chỗ khác trong menu (grid menu, AI menu) | Ngoài scope; chỉ fix cho standard `.bn-suggestion-menu` trong ví dụ này                                   |
| Chuyển chế độ mất caret position                                         | Chấp nhận — best-effort                                                                                   |
| Palette label render bằng KaTeX kích thước không nhất quán               | Đặt height cố định cho nút palette (như hiện tại), dùng CSS scale nếu cần                                 |

## Migration & tương thích

Không có migration data — LaTeX string vẫn là canonical format. Block/inline đã lưu từ trước vẫn edit được không đổi.

## Ước lượng scope

- ~1 file mới (`MathFieldWrapper.tsx`) ~80 dòng.
- Viết lại `FormulaEditorModal.tsx` (~250 dòng).
- Sửa `palettes.ts` (thay shape + thêm items nâng cao).
- Sửa `styles.css` (thêm styles mode toggle, LaTeX textarea, CSS override slash menu).
- Xóa `insertAtCaret.ts`.
- Sửa tests browser scenarios.

**Estimate:** 6-8 tasks nhỏ. Đơn giản hơn phase 1 vì chỉ đụng modal + CSS, không đụng schema/pipeline/toolbar.
