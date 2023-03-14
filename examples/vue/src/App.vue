<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { BlockNoteEditor } from "@blocknote/core"
import { EditorContent } from "@tiptap/vue-3"

const editor = ref()
onMounted(() => {
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
      // blockSideMenuFactory,
    },
    onEditorContentChange: () => {
      console.log(editor.topLevelBlocks)
    },
    editorDOMAttributes: {
      class: "editor",
    },
    _tiptapOptions: {
      content: 'Blocknote with vue3'
    }
  })
})
</script>

<template>
  <editor-content :editor="editor?._tiptapEditor" />
</template>
