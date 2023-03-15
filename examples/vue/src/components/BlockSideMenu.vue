<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps<{
  staticParams?: any
}>()

const show = ref(false)
const title = ref('')
const text = ref('')
function addBlock(event) {
  console.log('auie', event)
  props.staticParams.addBlock()
}
function onDragStart() {
  console.log('drag')
  props.staticParams.blockDragStart()
}
function onDragEnd() {
  console.log('drag end')
  props.staticParams.blockDragEnd()
}

</script>

<template>
  <div class="block-side-menu">
    <button @click="addBlock($event)">+</button>
    <button @click.stop @dragstart="onDragStart" @dragend="onDragEnd" draggable>::</button>
  </div>
</template>

<style style="postcss" scoped>
.block-side-menu {
  display: block;
  position: absolute;
}
</style>
