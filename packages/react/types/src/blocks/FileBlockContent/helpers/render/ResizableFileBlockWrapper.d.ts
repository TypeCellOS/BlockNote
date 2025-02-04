import { FileBlockConfig } from "@blocknote/core";
import { ReactNode } from "react";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";
export declare const ResizableFileBlockWrapper: (props: Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef"> & {
    buttonText: string;
    buttonIcon: ReactNode;
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
