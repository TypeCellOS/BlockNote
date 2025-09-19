import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import katex from "katex";

export const equationBlockConfig = createBlockConfig(
  // No options for equation block
  () => ({
    type: "equation" as const,
    propSchema: {
      latex: {
        default: "",
      },
    },
    content: "none" as const,
  })
);

export const createEquationBlockSpec = createBlockSpec(
  equationBlockConfig(),
  () => ({
    meta: {
      isolating: true,
    },
    parse: (element) => {
      if (element.tagName !== "DIV" || !element.classList.contains("equation")) {
        return undefined;
      }
      const latex = element.getAttribute("data-latex") || "";
      return { latex };
    },
    render: (block, editor) => {
      const wrapper = document.createElement("div");
      wrapper.className = "equation-wrapper";

      // Editable input for LaTeX
      const input = document.createElement("div");
      input.className = "equation-input";
      input.contentEditable = "true";
      input.textContent = block.props.latex || "";
      input.style.fontFamily = "monospace";
      input.style.padding = "8px";
      input.style.border = "1px solid #ccc";
      input.style.borderRadius = "4px";
      input.style.marginBottom = "8px";

      // Function to update preview
      const updatePreview = () => {
        const latex = input.textContent || "";
        const preview = wrapper.querySelector(".equation-preview");
        if (preview) {
          try {
            const html = katex.renderToString(latex, {
              throwOnError: false,
              displayMode: true,
            });
            preview.innerHTML = html;
          } catch (error) {
            preview.innerHTML = "<span style='color: red;'>Invalid LaTeX</span>";
          }
        }
        // Update block props
        if (latex !== block.props.latex) {
          editor.updateBlock(block, { props: { latex } });
        }
      };

      // Initial preview
      const preview = document.createElement("div");
      preview.className = "equation-preview";
      preview.style.padding = "8px";
      preview.style.border = "1px solid #eee";
      preview.style.borderRadius = "4px";
      preview.style.minHeight = "1em";
      updatePreview();

      wrapper.appendChild(input);
      wrapper.appendChild(preview);

      // Listen for changes
      input.addEventListener("input", updatePreview);

      return {
        dom: wrapper,
        contentDOM: undefined,
        destroy: () => {
          input.removeEventListener("input", updatePreview);
        },
      };
    },
    toExternalHTML: (block) => {
      const div = document.createElement("div");
      div.className = "equation";
      div.setAttribute("data-latex", block.props.latex || "");
      try {
        const html = katex.renderToString(block.props.latex || "", {
          throwOnError: false,
          displayMode: true,
        });
        div.innerHTML = html;
      } catch (error) {
        div.textContent = block.props.latex || "";
      }
      return {
        dom: div,
        contentDOM: undefined,
      };
    },
    runsBefore: ["default"],
    
  }),
  [
    createBlockNoteExtension({
      key: "equation-shortcuts",
      keyboardShortcuts: {
        "Mod-Alt-E": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();
          const newBlock = editor.insertBlocks(
            [{ type: "equation"}],
            cursorPosition.block,
            "before"
          )[0];
          editor.setTextCursorPosition(newBlock, "end");
          return true;
        },
      },
    }),
  ]
);
