import { FileBlockConfig } from "@blocknote/core";
import {
  AddFileButton,
  createReactBlockSpec,
  DefaultFilePreview,
  FileAndCaptionWrapper,
  ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { RiFilePdfFill } from "react-icons/ri";
import "./pdf.pdf";

import "./styles.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { DocumentCallback } from "react-pdf/dist/cjs/shared/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Component for the PDF preview.
export const PDFPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  const [document, setDocument] = useState<DocumentCallback | undefined>(
    undefined
  );
  const [editorWidth, setEditorWidth] = useState<number | undefined>(
    () =>
      props.editor.domElement.firstElementChild!.getBoundingClientRect().width
  );

  // Callback to save the PDF document to state once fetched.
  const onLoadSuccess = useCallback((document: DocumentCallback) => {
    setDocument(document);
  }, []);

  // Resizes the preview dynamically when the editor width changes.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setEditorWidth(
        props.editor.domElement.firstElementChild!.getBoundingClientRect().width
      );
    });
    observer.observe(props.editor.domElement);
  }, [props.editor.domElement]);

  const renderedPages = useMemo(() => {
    const renderedPages = [];

    if (document) {
      for (let i = 1; i <= document.numPages; i++) {
        renderedPages.push(
          <Page
            className={"pdf-page"}
            key={i}
            pageNumber={i}
            width={editorWidth}
          />
        );
      }
    }

    return renderedPages;
  }, [document, editorWidth]);

  return (
    <Document
      className={"pdf-preview"}
      file={props.block.props.url}
      onLoadSuccess={onLoadSuccess}>
      {renderedPages}
    </Document>
  );
};

export const PDF = createReactBlockSpec(
  {
    type: "pdf",
    propSchema: {
      name: {
        default: "" as const,
      },
      url: {
        default: "" as const,
      },
      caption: {
        default: "" as const,
      },
      showPreview: {
        default: true,
      },
      previewWidth: {
        default: 512,
      },
    },
    content: "none",
    isFileBlock: true,
  },
  {
    render: (props) => (
      <div className={"bn-file-block-content-wrapper"}>
        {props.block.props.url === "" ? (
          <AddFileButton
            {...props}
            editor={props.editor as any}
            buttonText={"Add PDF"}
            buttonIcon={<RiFilePdfFill size={24} />}
          />
        ) : !props.block.props.showPreview ? (
          <FileAndCaptionWrapper
            block={props.block}
            editor={props.editor as any}>
            <DefaultFilePreview
              block={props.block}
              editor={props.editor as any}
            />
          </FileAndCaptionWrapper>
        ) : (
          <FileAndCaptionWrapper
            block={props.block}
            editor={props.editor as any}>
            <PDFPreview block={props.block} editor={props.editor as any} />
          </FileAndCaptionWrapper>
        )}
      </div>
    ),
  }
);
PDF.implementation.node.config.selectable = false;
