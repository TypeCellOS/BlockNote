import { test, expect } from "@playwright/experimental-ct-react";
// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  defaultReactSlashMenuItems,
  ReactSlashMenuItem,
  useBlockNote,
} from "@blocknote/react";
import {
  createBlockSpec,
  defaultBlockSchema,
  defaultProps,
} from "@blocknote/core";
// import { RiImageFill } from "react-icons/ri";

const customBlockSchema = {
  ...defaultBlockSchema,
  image: createBlockSpec({
    type: "image",
    propSchema: {
      src: {
        default: "https://via.placeholder.com/150",
      },
    } as const,
    containsInlineContent: true,
    render: (props) => {
      const parent = document.createElement("div");
      const editable = document.createElement("div");

      const img = document.createElement("img");
      img.setAttribute("src", props.src);
      img.setAttribute("contenteditable", "false");

      parent.appendChild(editable);
      parent.appendChild(img);

      return { dom: parent, contentDOM: editable };
    },
  }),
  spoiler: createBlockSpec({
    type: "spoiler",
    propSchema: {
      ...defaultProps,
      // hidden: {
      //   default: "false"
      // }
    } as const,
    containsInlineContent: true,
    render: () => {
      const parent = document.createElement("div");
      const editable = document.createElement("div");

      const button = document.createElement("button");
      button.innerText = "Show/Hide";
      button.addEventListener("click", () => {
        const blockContent = parent.parentElement!;
        const blockContainer = blockContent.parentElement!;

        if (blockContainer.childElementCount === 2) {
          const blockGroup = blockContainer.lastChild! as HTMLElement;
          blockGroup.setAttribute("data-hidden", "true");
        }
      });

      parent.appendChild(editable);
      parent.appendChild(button);

      return { dom: parent, contentDOM: editable };
    },
  }),
  youtubeEmbed: createBlockSpec({
    type: "youtubeEmbed",
    propSchema: {
      src: { default: "https://www.youtube.com/embed/wjfuB8Xjhc4" },
    } as const,
    containsInlineContent: false,
    render: (props) => {
      console.log(props);
      const parent = document.createElement("div");
      const iframe = document.createElement("iframe");
      iframe.setAttribute("width", "560");
      iframe.setAttribute("height", "315");
      iframe.setAttribute("src", props.src);
      iframe.setAttribute("title", "YouTube video player");
      iframe.setAttribute("frameBorder", "0");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      );
      iframe.setAttribute("allowFullScreen", "true");
      // iframe.setAttribute("contenteditable", "false");

      parent.appendChild(iframe);

      return { dom: parent };
    },
  }),
} as const;

const imageSlashMenuItem: ReactSlashMenuItem<typeof customBlockSchema> =
  new ReactSlashMenuItem<typeof customBlockSchema>(
    "Image",
    (editor) => {
      editor.insertBlocks(
        [
          {
            type: "image",
            props: {
              src: "https://cdn.skinport.com/cdn-cgi/image/width=512,height=384,fit=pad,format=webp,quality=85,background=transparent/images/screenshots/148340547/playside.png",
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    ["img"],
    "Media",
    (
      // <RiImageFill size={18} />,
      <div />
    ),

    "Used to insert an image into the document"
  );

const spoilerSlashMenuItem: ReactSlashMenuItem<typeof customBlockSchema> =
  new ReactSlashMenuItem<typeof customBlockSchema>(
    "Spoiler",
    (editor) => {
      editor.insertBlocks(
        [
          {
            type: "spoiler",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    ["toggle, dropdown, hide"],
    "Media",
    (
      // <RiImageFill size={18} />,
      <div />
    ),
    "Used to insert a spoiler into the document"
  );

const youtubeEmbedSlashMenuItem: ReactSlashMenuItem<typeof customBlockSchema> =
  new ReactSlashMenuItem<typeof customBlockSchema>(
    "YouTube Embed",
    (editor) => {
      editor.insertBlocks(
        [
          {
            type: "youtubeEmbed",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    ["yt", "video", "embed"],
    "Media",
    (
      // <RiImageFill size={18} />,
      <div />
    ),

    "Used to insert an embedded YouTube video into the document"
  );

function App() {
  const editor = useBlockNote({
    blockSchema: customBlockSchema,
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    slashCommands: [
      ...defaultReactSlashMenuItems<typeof customBlockSchema>(),
      imageSlashMenuItem,
      spoilerSlashMenuItem,
      youtubeEmbedSlashMenuItem,
    ],
    editorDOMAttributes: {
      // class: styles.editor,
      "data-test": "editor",
    },
  });

  return <BlockNoteView editor={editor} />;
}

test.use({ viewport: { width: 500, height: 500 } });

test("should work", async ({ mount }) => {
  const component = await mount(<App />);
  await expect(component).toBeVisible();
});
