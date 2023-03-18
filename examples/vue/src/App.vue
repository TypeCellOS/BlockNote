<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { BlockNoteEditor } from "@blocknote/core"
import { EditorContent } from "@tiptap/vue-3"
import { blockSideMenuFactory } from "@/ui/blockSideMenuFactory"

const md = `# Curabitur nisi.

Vestibulum **rutrum**, mi nec _elementum_ vehicula, eros quam gravida nisl, id fringilla neque ante vel mi.

## Vestibulum ullamcorper mauris at ligula.

Maecenas vestibulum mollis diam.

Donec posuere vulputate arcu.
`

const editor = ref()
onMounted(async () => {
  // Convert md to html
  const Editor = new BlockNoteEditor({})
  const blocks = await Editor.markdownToBlocks(md)
  const content = await Editor.blocksToHTML(blocks)

  const editor = new BlockNoteEditor({
    parentElement: document.getElementById("app")!,
    uiFactories: {
      // Create an example formatting toolbar which just consists of a bold toggle
      // formattingToolbarFactory,
      // // Create an example menu for hyperlinks
      // hyperlinkToolbarFactory,
      // // Create an example menu for the /-menu
      // slashMenuFactory: slashMenuFactory,
      // // Create an example menu for when a block is hovered
      blockSideMenuFactory,
    },
    onEditorContentChange: () => {
      // console.log(editor.topLevelBlocks)
    },
    editorDOMAttributes: {
      class: "editor",
    },
    _tiptapOptions: {
      content
    }
  })
})
</script>

<template>
  <div>
    <editor-content :editor="editor?._tiptapEditor" />
  </div>
</template>
