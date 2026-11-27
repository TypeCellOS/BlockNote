import type { KitchenSinkBlock } from "../schema.js";

export const equations: KitchenSinkBlock[] = [
  {
    type: "mathBlock",
    content: "",
  },
  {
    type: "mathBlock",
    content: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
  },
  {
    type: "paragraph",
    content: [
      "Inline equation: ",
      {
        type: "math",
        content: "e^{i\\pi}+1=0",
      },
    ],
  },
  {
    type: "diagram",
    content: "",
  },
  {
    type: "diagram",
    content:
      "graph TD\n  A[Start] --> B{Ready?}\n  B -->|Yes| C[Finish]\n  B -->|No| A",
  },
  {
    type: "diagram",
    content:
      "sequenceDiagram\n  User->>Editor: Select text\n  Editor-->>User: Show toolbar",
  },
];
