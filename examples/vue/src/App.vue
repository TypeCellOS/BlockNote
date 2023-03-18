<script lang="ts" setup>
import { ref, watch } from "vue"
import BlockNoteView from "@/BlockNoteView.vue"

const md = `# Curabitur nisi.

Vesatibulum **rutrum**, mi nec _elementum_ vehicula, eros quam gravida nisl, id fringilla neque ante vel mi.

## Vestibulum ullamcorper mauris at ligula.

Maecenas vestibulum mollis diam.

Donec posuere vulputate arcu.
`

const content = ref(md)

watch(content, (val) => {
  console.log(val)
})
</script>

<template>
  <BlockNoteView v-model="content" />
</template>
