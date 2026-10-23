import { COLORS_DEFAULT, type PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";

const colors = ["default", ...Object.keys(COLORS_DEFAULT)];
const blockColors: PartialBlock[] = colors.flatMap((backgroundColor) => [
  {
    id: `block-heading-${backgroundColor}`,
    type: "heading",
    props: { level: 3 },
    content: `${backgroundColor} background`,
  },
  ...colors.map((textColor) => ({
    id: `block-${backgroundColor}-${textColor}`,
    type: "paragraph" as const,
    props: { textColor, backgroundColor },
    content: `${textColor} text on ${backgroundColor} background`,
  })),
]);
const inlineColors: PartialBlock[] = colors.flatMap((backgroundColor) => [
  {
    id: `inline-heading-${backgroundColor}`,
    type: "heading",
    props: { level: 3 },
    content: `${backgroundColor} background`,
  },
  ...colors.map((textColor) => ({
    id: `inline-${backgroundColor}-${textColor}`,
    type: "paragraph" as const,
    content: [
      { type: "text" as const, text: "Inline: ", styles: {} },
      {
        type: "text" as const,
        text: `${textColor} text on ${backgroundColor} background`,
        styles: { textColor, backgroundColor },
      },
    ],
  })),
]);

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const blocks = useCreateBlockNote({ initialContent: blockColors });
  const inline = useCreateBlockNote({ initialContent: inlineColors });

  return (
    <div>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        Dark mode
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 24,
        }}
      >
        <section aria-label="Block color combinations">
          <h2>Block colors</h2>
          <BlockNoteView editor={blocks} theme={theme} />
        </section>
        <section aria-label="Inline color combinations">
          <h2>Inline colors</h2>
          <BlockNoteView editor={inline} theme={theme} />
        </section>
      </div>
    </div>
  );
}
