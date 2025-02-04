import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { BlockNoteView, FormattingToolbar, FormattingToolbarController, ToolbarButton, createReactStyleSpec, useActiveStyles, useBlockNote, useBlockNoteEditor, } from "@blocknote/react";
import "@blocknote/react/style.css";
const small = createReactStyleSpec({
    type: "small",
    propSchema: "boolean",
}, {
    render: (props) => {
        return _jsx("small", { ref: props.contentRef });
    },
});
const fontSize = createReactStyleSpec({
    type: "fontSize",
    propSchema: "string",
}, {
    render: (props) => {
        return (_jsx("span", { ref: props.contentRef, style: { fontSize: props.value } }));
    },
});
export const schema = BlockNoteSchema.create({
    styleSpecs: {
        ...defaultStyleSpecs,
        small,
        fontSize,
    },
});
const CustomFormattingToolbar = (props) => {
    const editor = useBlockNoteEditor();
    const activeStyles = useActiveStyles(editor);
    return (_jsxs(FormattingToolbar, { children: [_jsx(ToolbarButton, { mainTooltip: "small", onClick: () => {
                    editor.toggleStyles({
                        smnall: true,
                    });
                }, isSelected: activeStyles.small, children: "Small" }), _jsx(ToolbarButton, { mainTooltip: "font size", onClick: () => {
                    editor.toggleStyles({
                        fontSize: "30px",
                    });
                }, isSelected: !!activeStyles.fontSize, children: "Font size" })] }));
};
export default function App() {
    const editor = useBlockNote({
        schema,
        initialContent: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "large text",
                        styles: {
                            fontSize: "30px",
                        },
                    },
                    {
                        type: "text",
                        text: "small text",
                        styles: {
                            small: true,
                        },
                    },
                ],
            },
        ],
    }, []);
    return (_jsx(BlockNoteView, { className: "root", editor: editor, children: _jsx(FormattingToolbarController, { formattingToolbar: CustomFormattingToolbar }) }));
}
