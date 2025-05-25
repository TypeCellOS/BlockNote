import { InputRule, isTextSelection } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import katex from "katex";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";

export type KaTeXBlockOptions = {
  /**
   * Whether to indent lines with a tab when the user presses `Tab` in a KaTeX block.
   *
   * @default true
   */
  indentLineWithTab?: boolean;
  /**
   * KaTeX rendering options
   */
  katexOptions?: katex.KatexOptions;
};

// KaTeX block options are handled directly in the implementation

export const defaultKaTeXBlockPropSchema = {
  equation: {
    default: "",
  },
  displayMode: {
    default: true,
  },
} satisfies PropSchema;

const KaTeXBlockContent = createStronglyTypedTiptapNode({
  name: "katexBlock",
  content: "inline*",
  group: "blockContent",
  marks: "insertion deletion modification",
  defining: true,
  addOptions() {
    return {
      indentLineWithTab: true,
      katexOptions: {
        throwOnError: false,
        errorColor: "#f44336",
      },
    };
  },
  addAttributes() {
    return {
      equation: {
        default: "",
        parseHTML: (element) => {
          const katexElement = element as HTMLElement;
          return katexElement.getAttribute("data-equation") || "";
        },
        renderHTML: (attributes) => {
          return {
            "data-equation": attributes.equation,
          };
        },
      },
      displayMode: {
        default: true,
        parseHTML: (element) => {
          const katexElement = element as HTMLElement;
          return katexElement.getAttribute("data-display-mode") === "true";
        },
        renderHTML: (attributes) => {
          return {
            "data-display-mode": String(attributes.displayMode),
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      // Parse from internal HTML.
      {
        tag: "div[data-content-type=" + this.name + "]",
        contentElement: ".bn-inline-content",
      },
      // Parse from external HTML.
      {
        tag: "div.katex-block",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
      this.name,
      "div",
      this.options.domAttributes?.blockContent || {},
      {
        ...(this.options.domAttributes?.inlineContent || {}),
        ...HTMLAttributes,
      }
    );

    return {
      dom,
      contentDOM,
    };
  },
  addNodeView() {
    return ({ editor, node, getPos, HTMLAttributes }) => {
      
      // Create elements
      const wrapper = document.createElement("div");
      const katexOutput = document.createElement("div");
      const input = document.createElement("textarea");
      const displayModeToggle = document.createElement("label");
      const displayModeCheckbox = document.createElement("input");
      const controlsWrapper = document.createElement("div");

      // Set up initial values
      const equation = node.attrs.equation || "";
      const displayMode = node.attrs.displayMode !== false;

      // Create DOM structure
      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        "div",
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
          class: "katex-block",
        },
        this.options.domAttributes?.inlineContent || {}
      );

      // Style elements
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.width = "100%";
      
      katexOutput.className = "katex-output";
      katexOutput.style.minHeight = "2em";
      katexOutput.style.padding = "8px";
      katexOutput.style.margin = "4px 0";
      katexOutput.style.border = "1px solid #ddd";
      katexOutput.style.borderRadius = "4px";
      katexOutput.style.backgroundColor = "#f9f9f9";
      
      input.style.width = "100%";
      input.style.padding = "8px";
      input.style.border = "1px solid #ddd";
      input.style.borderRadius = "4px";
      input.style.fontFamily = "monospace";
      input.style.minHeight = "2em";
      input.placeholder = "Enter LaTeX equation...";
      input.value = equation;
      
      controlsWrapper.style.display = "flex";
      controlsWrapper.style.alignItems = "center";
      controlsWrapper.style.marginTop = "4px";
      
      displayModeCheckbox.type = "checkbox";
      displayModeCheckbox.checked = displayMode;
      displayModeCheckbox.id = "katex-display-mode-" + Math.random().toString(36).substring(2);
      
      displayModeToggle.htmlFor = displayModeCheckbox.id;
      displayModeToggle.appendChild(displayModeCheckbox);
      displayModeToggle.appendChild(document.createTextNode(" Display mode"));
      displayModeToggle.style.marginLeft = "4px";
      displayModeToggle.style.userSelect = "none";
      displayModeToggle.style.fontSize = "0.9em";
      
      // Hide content DOM as we're using our own input
      contentDOM.style.display = "none";
      
      // Set up event handlers
      const updateKatex = () => {
        try {
          const katexOptions = {
            ...(this.options.katexOptions),
            displayMode: displayModeCheckbox.checked,
            throwOnError: false,
            errorColor: "#f44336",
          };
          
          katex.render(input.value, katexOutput, katexOptions);
          
          // Update the node attributes
          editor.commands.command(({ tr }) => {
            if (typeof getPos === "function") {
              tr.setNodeAttribute(getPos(), "equation", input.value);
              tr.setNodeAttribute(getPos(), "displayMode", displayModeCheckbox.checked);
              return true;
            }
            return false;
          });
        } catch (error: any) {
          katexOutput.innerHTML = `<span style="color: #f44336;">Error: ${error?.message || 'Error rendering equation'}</span>`;
        }
      };
      
      input.addEventListener("input", updateKatex);
      displayModeCheckbox.addEventListener("change", updateKatex);
      
      // Initial render
      updateKatex();
      
      // Assemble the DOM
      controlsWrapper.appendChild(displayModeToggle);
      wrapper.appendChild(katexOutput);
      wrapper.appendChild(input);
      wrapper.appendChild(controlsWrapper);
      dom.appendChild(wrapper);
      
      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }
          
          // Update input value if it's changed externally
          if (updatedNode.attrs.equation !== input.value) {
            input.value = updatedNode.attrs.equation;
          }
          
          // Update display mode if it's changed externally
          if (updatedNode.attrs.displayMode !== displayModeCheckbox.checked) {
            displayModeCheckbox.checked = updatedNode.attrs.displayMode;
          }
          
          updateKatex();
          return true;
        },
        destroy: () => {
          input.removeEventListener("input", updateKatex);
          displayModeCheckbox.removeEventListener("change", updateKatex);
        },
      };
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$\s$/,
        handler: ({ state, range }) => {
          const $start = state.doc.resolve(range.from);
          const attributes = {
            equation: "",
            displayMode: true,
          };

          if (
            !$start
              .node(-1)
              .canReplaceWith(
                $start.index(-1),
                $start.indexAfter(-1),
                this.type
              )
          ) {
            return null;
          }

          state.tr
            .delete(range.from, range.to)
            .setBlockType(range.from, range.from, this.type, attributes)
            .setSelection(TextSelection.create(state.tr.doc, range.from));

          return;
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        // When inside empty KaTeX block, on `DELETE` key press, delete the block
        if (
          editor.isActive(this.name) &&
          !$from.parent.textContent &&
          isTextSelection(selection)
        ) {
          // Get the start position of the block for node selection
          const from = $from.pos - $from.parentOffset - 2;

          editor.chain().setNodeSelection(from).deleteSelection().run();

          return true;
        }

        return false;
      },
      Tab: ({ editor }) => {
        if (!this.options.indentLineWithTab) {
          return false;
        }
        if (editor.isActive(this.name)) {
          editor.commands.insertContent("  ");
          return true;
        }

        return false;
      },
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;

        if (!editor.isActive(this.name)) {
          return false;
        }

        return editor
          .chain()
          .command(({ tr }) => {
            // Create a new paragraph below
            const pos = $from.after();
            tr.insert(pos, editor.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, pos + 1));
            return true;
          })
          .run();
      },
    };
  },
});

export const KaTeXBlock = createBlockSpecFromStronglyTypedTiptapNode(
  KaTeXBlockContent,
  defaultKaTeXBlockPropSchema
);
