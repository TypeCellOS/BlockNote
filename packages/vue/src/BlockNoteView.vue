<script lang="ts" setup>
import type { ComponentInternalInstance } from "vue"
import { onMounted, ref, useSlots, getCurrentInstance } from "vue"
import { BlockNoteEditor, defaultSlashMenuItems } from "@blocknote/core"
import type { BlockNoteEditorOptions, Block } from "@blocknote/core"
import { EditorContent } from "@tiptap/vue-3"
import { slashMenuFactory } from "@/SlashMenu/slashMenuFactory"
import { blockSideMenuFactory } from "@/BlockSideMenu/blockSideMenuFactory"

const props = defineProps<{
  modelValue: Block[]
  options?: BlockNoteEditorOptions
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', payload: Block[]): void
}>()

const component: ComponentInternalInstance = getCurrentInstance()!

const editor = ref()
onMounted(async () => {
  // Convert md to html
  const Editor = new BlockNoteEditor({})
  const content = await Editor.blocksToHTML(props.modelValue)

  const editor = new BlockNoteEditor({
    parentElement: document.getElementById("app")!,
    slashCommands: defaultSlashMenuItems,
    uiFactories: {
      // Create an example formatting toolbar which just consists of a bold toggle
      // formattingToolbarFactory,
      // // Create an example menu for hyperlinks
      // hyperlinkToolbarFactory,
      // Create an example menu for the /-menu
      slashMenuFactory: slashMenuFactory(component),
      // // Create an example menu for when a block is hovered
      blockSideMenuFactory: blockSideMenuFactory(component),
    },
    onEditorContentChange() {
      emit('update:modelValue', editor.topLevelBlocks)
    },
    editorDOMAttributes: {
      class: "editor",
    },
    _tiptapOptions: {
      content
    },
    ...props.options
  })

  // console.log(editor)
})

</script>

<template>
  <div>
    <editor-content :editor="editor?._tiptapEditor" />
  </div>
</template>
