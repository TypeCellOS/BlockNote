import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  ImageToolbarState,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";
import {
  Button,
  FileInput,
  LoadingOverlay,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Toolbar } from "../../components-shared/Toolbar/Toolbar";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";

type BaseImageBlockConfig = {
  type: "image";
  propSchema: {
    url: {
      default: string;
    };
  };
  content: "none";
};

function checkImageInSchema(
  // TODO: Fix any, should be BlockSchema but smth is broken
  editor: BlockNoteEditor<any, InlineContentSchema, StyleSchema>
): editor is BlockNoteEditor<
  {
    image: BaseImageBlockConfig;
  },
  InlineContentSchema,
  StyleSchema
> {
  return (
    // Checks if the block has a `url` prop which can take any string value.
    "url" in editor.blockSchema["image"].propSchema &&
    typeof editor.blockSchema["image"].propSchema.url.default === "string" &&
    !("values" in editor.blockSchema["image"].propSchema.url) === undefined
  );
}

export type ImageToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Omit<ImageToolbarState<BSchema, I, S>, keyof UiElementPosition>;

export const DefaultImageToolbar = (
  props: ImageToolbarProps<BlockSchema, InlineContentSchema, StyleSchema>
) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const imageInSchema = checkImageInSchema(editor);

  const [openTab, setOpenTab] = useState<"upload" | "embed">(
    editor.uploadFile !== undefined ? "upload" : "embed"
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadFailed, setUploadFailed] = useState<boolean>(false);

  useEffect(() => {
    if (uploadFailed) {
      setTimeout(() => {
        setUploadFailed(false);
      }, 3000);
    }
  }, [uploadFailed]);

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file === null) {
        return;
      }

      async function upload(file: File) {
        setUploading(true);

        if (imageInSchema && editor.uploadFile !== undefined) {
          try {
            const uploaded = await editor.uploadFile(file);
            editor.updateBlock(props.block, {
              type: "image",
              props: {
                url: uploaded,
              },
            });
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setUploading(false);
          }
        }
      }

      upload(file);
    },
    [editor, imageInSchema, props.block]
  );

  const [currentURL, setCurrentURL] = useState<string>("");

  const handleURLChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCurrentURL(event.currentTarget.value);
    },
    []
  );

  const handleURLEnter = useCallback(
    (event: KeyboardEvent) => {
      if (imageInSchema && event.key === "Enter") {
        event.preventDefault();
        editor.updateBlock(props.block, {
          type: "image",
          props: {
            url: currentURL,
          },
        });
      }
    },
    [imageInSchema, editor, props.block, currentURL]
  );

  const handleURLClick = useCallback(() => {
    if (imageInSchema) {
      editor.updateBlock(props.block, {
        type: "image",
        props: {
          url: currentURL,
        },
      });
    }
  }, [imageInSchema, editor, props.block, currentURL]);

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {uploading && <LoadingOverlay visible={uploading} />}

        <Tabs.List>
          {editor.uploadFile !== undefined && (
            <Tabs.Tab value="upload" data-test={"upload-tab"}>
              Upload
            </Tabs.Tab>
          )}
          <Tabs.Tab value="embed" data-test={"embed-tab"}>
            Embed
          </Tabs.Tab>
        </Tabs.List>

        {editor.uploadFile !== undefined && (
          <Tabs.Panel className={"bn-upload-image-panel"} value="upload">
            <div>
              <FileInput
                placeholder={"Upload Image"}
                size={"xs"}
                value={null}
                onChange={handleFileChange}
                data-test={"upload-input"}
              />
              {uploadFailed && (
                <Text c={"red"} size={"12px"}>
                  Error: Upload failed
                </Text>
              )}
            </div>
          </Tabs.Panel>
        )}
        <Tabs.Panel className={"bn-embed-image-panel"} value="embed">
          <div>
            <TextInput
              size={"xs"}
              placeholder={"Enter URL"}
              value={currentURL}
              onChange={handleURLChange}
              onKeyDown={handleURLEnter}
              data-test={"embed-input"}
            />
            <Button
              className={"bn-embed-image-button"}
              onClick={handleURLClick}
              size={"xs"}
              data-test={"embed-input-button"}>
              Embed Image
            </Button>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Toolbar>
  );
};
