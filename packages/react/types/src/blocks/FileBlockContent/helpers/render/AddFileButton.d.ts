import { FileBlockConfig } from "@blocknote/core";
import { ReactNode } from "react";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";
export declare const AddFileButton: (props: Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef"> & {
    buttonText?: string;
    buttonIcon?: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
