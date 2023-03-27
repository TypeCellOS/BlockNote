<script lang="ts" setup>
import { reactive, ref, watch } from "vue"
import { BlockNoteView } from "@blocknote/vue"
import blocks from './blocks.json'
import type { Block } from "@blocknote/core"

import "@blocknote/core/style.css"
// import '@blocknote/vue/style.css'

// TODO fix any
const content = ref<any[]>(blocks)
// const content: Block[] = ref(blocks) as Block[]
</script>

<template>
  <BlockNoteView v-model="content">
    <template #BlockSideMenu-AddBlock="{ staticParams }">
      <button @click="staticParams.addBlock()">+</button>
    </template>

    <template #SlashMenuItem-Heading="{ menu, selected, onClick }">
      <button @click="onClick()" :style="selected && 'font-weight: bold;'">Slot {{ menu.name }}</button>
    </template>
  </BlockNoteView>
</template>
