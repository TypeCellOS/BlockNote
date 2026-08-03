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
