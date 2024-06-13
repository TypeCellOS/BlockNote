import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { FilePanelProps } from "../FilePanelProps";
import Uppy from "@uppy/core";
import XHR from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";
import get from "lodash.get";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export const UppyTab = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FilePanelProps<I, S> & {
    setLoading: (loading: boolean) => void;
  }
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { block, setLoading } = props;

  const editor = useBlockNoteEditor<B, I, S>();
  const endpoint = editor.endpoint;
  const urlPath = editor.urlPath;
  const maxNumberOfFiles = 1;
  const config = editor.schema.blockSchema[block.type];
  const accept =
    config.isFileBlock && config.fileBlockAcceptMimeTypes?.length
      ? config.fileBlockAcceptMimeTypes.join(",")
      : "*/*";

  const [uploadFailed, setUploadFailed] = useState<boolean>(false);
  const [uppyInstance, setUppyInstance] = useState<Uppy | null>(null);

  useEffect(() => {
    if (uploadFailed) {
      setTimeout(() => {
        setUploadFailed(false);
      }, 3000);
    }
  }, [uploadFailed]);

  const handleFileChangev2 = useCallback(
    (file: File | null, uploadURL: string | null) => {
      if (file === null) {
        return;
      }
      async function upload(file: File, uploadURL: string | null) {
        setLoading(true);
        if (editor.uploadFile !== undefined && !endpoint) {
          try {
            let updateData = await editor.uploadFile(file);
            if (typeof updateData === "string") {
              // received a url
              updateData = {
                props: {
                  name: file.name,
                  url: updateData,
                },
              };
            }
            editor.updateBlock(block, updateData);
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setLoading(false);
          }
        }

        if (endpoint) {
          const updateData = {
            props: {
              name: file.name,
              url:
                uploadURL ||
                URL.createObjectURL(new Blob([await file.arrayBuffer()])),
            },
          } as Record<string, any>;
          editor.updateBlock(block, updateData);
          setLoading(false);
        }
      }

      upload(file, uploadURL);
    },
    [block, editor]
  );

  useEffect(() => {
    const uppy = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        allowedFileTypes: accept
          ? accept.split(",")
          : ["image/*", "video/*", "audio/*"],
      },
      autoProceed: true,
    });

    uppy.use(XHR, {
      endpoint: endpoint || "",
      formData: true,
      fieldName: maxNumberOfFiles > 1 ? "files" : "file",
    });

    uppy.on("complete", async (result) => {
      if (result.successful.length > 0) {
        const file = result.successful[0];
        const url = (
          urlPath
            ? get(file?.response, urlPath, "") ?? file.uploadURL
            : file.uploadURL
        ) as string;

        handleFileChangev2(file.data as File, url);
        setLoading(false);
      } else {
        setUploadFailed(true);
        setLoading(false);
      }
    });

    uppy.on("error", (error) => {
      setUploadFailed(true);
      setLoading(false);
    });

    setUppyInstance(uppy);

    return () => {
      uppy.close();
    };
  }, [editor]);

  return (
    <Components.FilePanel.TabPanel className="bn-panel-tab">
      <Dashboard
        id={`${block.id}-uppy`}
        uppy={uppyInstance ?? new Uppy()}
        fileManagerSelectionType="files"
        closeModalOnClickOutside={true}
      />
      {uploadFailed && (
        <div className="bn-error-text">
          {dict.file_panel.upload.upload_error}
        </div>
      )}
    </Components.FilePanel.TabPanel>
  );
};
