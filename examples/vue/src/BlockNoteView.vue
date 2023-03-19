<script lang="ts" setup>
import type { App } from "vue"
import { onMounted, ref, useSlots, getCurrentInstance } from "vue"
import { BlockNoteEditor } from "@blocknote/core"
import type { BlockNoteEditorOptions } from "@blocknote/core"
import { EditorContent } from "@tiptap/vue-3"
import { blockSideMenuFactory } from "@/ui/blockSideMenuFactory"

const props = defineProps<{
  modelValue: string
  options?: BlockNoteEditorOptions
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', payload: string): void
}>()

const slots = useSlots()

const app: App | any = getCurrentInstance()
const editor = ref()
onMounted(async () => {
  // Convert md to html
  const Editor = new BlockNoteEditor({})
  const blocks = await Editor.markdownToBlocks(props.modelValue)
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
      blockSideMenuFactory: blockSideMenuFactory(app, slots),
    },
    async onEditorContentChange() {
      emit('update:modelValue', await Editor.blocksToMarkdown(editor.topLevelBlocks))
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
