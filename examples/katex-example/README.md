# BlockNote KaTeX Equation Block

This example demonstrates the implementation of a custom block for KaTeX equations in BlockNote. It allows users to write and render LaTeX mathematical equations directly in the editor.

## Features

- Dedicated block for inputting and displaying LaTeX equations
- Display mode toggle for inline vs. block equations
- Real-time rendering preview as you type
- Keyboard shortcut: Type `$$` at the beginning of a line and press space to create an equation block
- Full LaTeX syntax support via KaTeX

## Usage

To use the KaTeX block in your BlockNote editor:

1. Create a new equation block via the block menu or by typing `$$` at the beginning of a line
2. Enter your LaTeX equation in the input field
3. Toggle "Display mode" to switch between inline and block equation display
4. The equation will be rendered in real-time as you type

## Example LaTeX Equations

Try these examples:

- Simple: `E = mc^2`
- Fractions: `\frac{1}{2} + \frac{1}{3} = \frac{5}{6}`
- Integrals: `\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}`
- Matrices: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
- Aligned equations: `\begin{align} a &= b + c \\ &= d + e \end{align}`

## Implementation

This block uses KaTeX for rendering LaTeX equations. The implementation adds:

1. A dedicated KaTeX block type
2. Configuration options for KaTeX rendering
3. CSS styling for proper equation display
4. Input handling for LaTeX content
