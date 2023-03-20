<script lang="ts" setup>
import { reactive, ref, watch } from "vue"
import BlockNoteView from "@/BlockNoteView.vue"
import blocks from './blocks.json'
import type { Block } from "@blocknote/core"

// TODO fix any
const content = ref<any[]>(blocks)
// const content: Block[] = ref(blocks) as Block[]
</script>

<template>
  <BlockNoteView v-model="content">
    <!-- <template #blockSideMenuAddBlock="{ staticParams }">
      <button @click="staticParams.addBlock()">+</button>
    </template> -->

    <template #slashMenuItem-Heading="{ menu, selected, onClick }">
      <button @click="onClick()" :style="selected && 'font-weight: bold;'">{{ menu.name }}</button>
    </template>
  </BlockNoteView>
</template>
