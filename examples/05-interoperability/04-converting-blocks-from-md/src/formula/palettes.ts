export type PaletteItem = {
  label: string;
  snippet: string;
  tooltip: string;
  caretOffset?: number;
};

export const mathPalette: PaletteItem[] = [
  { label: "x^{n}", snippet: "^{}", tooltip: "Mũ", caretOffset: 2 },
  { label: "x_{n}", snippet: "_{}", tooltip: "Chỉ số dưới", caretOffset: 2 },
  {
    label: "\\frac{a}{b}",
    snippet: "\\frac{}{}",
    tooltip: "Phân số",
    caretOffset: 6,
  },
  {
    label: "\\sqrt{x}",
    snippet: "\\sqrt{}",
    tooltip: "Căn bậc hai",
    caretOffset: 6,
  },
  {
    label: "\\sqrt[n]{x}",
    snippet: "\\sqrt[]{}",
    tooltip: "Căn bậc n",
    caretOffset: 6,
  },
  {
    label: "\\int_{a}^{b}",
    snippet: "\\int_{}^{}",
    tooltip: "Tích phân",
    caretOffset: 6,
  },
  {
    label: "\\sum_{i}^{n}",
    snippet: "\\sum_{}^{}",
    tooltip: "Tổng",
    caretOffset: 6,
  },
  {
    label: "\\lim_{x\\to a}",
    snippet: "\\lim_{}",
    tooltip: "Giới hạn",
    caretOffset: 6,
  },
  { label: "\\alpha", snippet: "\\alpha ", tooltip: "alpha" },
  { label: "\\beta", snippet: "\\beta ", tooltip: "beta" },
  { label: "\\pi", snippet: "\\pi ", tooltip: "pi" },
  { label: "\\theta", snippet: "\\theta ", tooltip: "theta" },
  { label: "\\infty", snippet: "\\infty ", tooltip: "vô cực" },
  { label: "\\times", snippet: "\\times ", tooltip: "nhân" },
  { label: "\\div", snippet: "\\div ", tooltip: "chia" },
  { label: "\\pm", snippet: "\\pm ", tooltip: "cộng/trừ" },
  { label: "\\leq", snippet: "\\leq ", tooltip: "nhỏ hơn hoặc bằng" },
  { label: "\\geq", snippet: "\\geq ", tooltip: "lớn hơn hoặc bằng" },
  { label: "\\neq", snippet: "\\neq ", tooltip: "khác" },
  { label: "\\approx", snippet: "\\approx ", tooltip: "xấp xỉ" },
  { label: "\\Rightarrow", snippet: "\\Rightarrow ", tooltip: "suy ra" },
  { label: "\\to", snippet: "\\to ", tooltip: "tiến tới" },
];

export const chemPalette: PaletteItem[] = [
  {
    label: "\\ce{}",
    snippet: "\\ce{}",
    tooltip: "Bọc công thức hóa",
    caretOffset: 4,
  },
  { label: "->", snippet: "->", tooltip: "Mũi tên phản ứng" },
  { label: "<=>", snippet: "<=>", tooltip: "Phản ứng thuận nghịch" },
  { label: "\\uparrow", snippet: "\\uparrow ", tooltip: "Khí bay lên" },
  { label: "\\downarrow", snippet: "\\downarrow ", tooltip: "Kết tủa" },
  { label: "(r)", snippet: "(r)", tooltip: "Trạng thái rắn" },
  { label: "(l)", snippet: "(l)", tooltip: "Trạng thái lỏng" },
  { label: "(k)", snippet: "(k)", tooltip: "Trạng thái khí" },
  { label: "(dd)", snippet: "(dd)", tooltip: "Dung dịch" },
  {
    label: "\\overset{t^o}{->}",
    snippet: "\\overset{t^o}{->}",
    tooltip: "Đun nóng",
  },
  {
    label: "\\overset{xt}{->}",
    snippet: "\\overset{xt}{->}",
    tooltip: "Có xúc tác",
  },
  { label: "H2O", snippet: "H2O", tooltip: "Nước" },
  { label: "H2SO4", snippet: "H2SO4", tooltip: "Axit sunfuric" },
  { label: "CO2", snippet: "CO2", tooltip: "Cacbonic" },
  { label: "NaCl", snippet: "NaCl", tooltip: "Muối ăn" },
  { label: "NH3", snippet: "NH3", tooltip: "Amoniac" },
  { label: "CH4", snippet: "CH4", tooltip: "Metan" },
];
