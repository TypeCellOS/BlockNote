/* eslint-disable import/no-extraneous-dependencies */
import React, { useEffect, useMemo } from "react";
import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { PartialBlock } from "@blocknote/core";

import { Dashboard } from "@uppy/react";
import Uppy from "@uppy/core";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { FilePanelProps } from "../FilePanelProps";

import { Props } from "@blocknote/core";

export const UploadTabUppy = React.memo(
  <
    B extends BlockSchema = DefaultBlockSchema,
    I extends InlineContentSchema = DefaultInlineContentSchema,
    S extends StyleSchema = DefaultStyleSchema
  >(
    props: FilePanelProps<I, S> & {
      setLoading: (loading: boolean) => void;
    }
  ) => {
    const Components = useComponentsContext() as any;

    const { block, setLoading } = props;
    const editor = useBlockNoteEditor<B, I, S>();

    const uppy = useMemo(() => editor.uploadFileUppy, [editor.uploadFileUppy]);

    useEffect(() => {
      if (uppy !== undefined) {
        const handleUploadSuccess = (file: any, response: any) => {
          if (response.status === 200) {
            uppy.removeFile(file.id);
          }

          let fileURL = response.body.data.url;

          if (fileURL.includes("tmpfiles.org")) {
            fileURL = fileURL.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          }

          const updateData: PartialBlock<B, I, S> = {
            props: {
              name: file.name,
              url: fileURL,
            } as Partial<Props<B[keyof B]["propSchema"]>>,
          };

          editor.updateBlock(block, updateData);
          setLoading(false);
        };

        uppy.on("upload-success", handleUploadSuccess);

        return () => {
          uppy.off("upload-success", handleUploadSuccess);
        };
      }
      return;
    }, [uppy, editor, block, setLoading]);

    return (
      <Components.FilePanel.TabPanel className="bn-panel-tab">
        <Dashboard id="dashboard" uppy={uppy ?? new Uppy()} />
      </Components.FilePanel.TabPanel>
    );
  }
);
