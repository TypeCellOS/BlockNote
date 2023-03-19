<script lang="ts" setup>
import type { SlashMenuProps } from './slashMenuFactory'

const props = defineProps<{
  staticParams: SlashMenuProps
}>()
</script>

<template>
  <slot name="slashMenu">
    <div></div>
  </slot>
</template>

<style style="postcss">
.slash-menu {
  display: none;
  position: absolute;
  background: white;
  box-shadow: rgb(223, 225, 230) 0px 4px 8px, rgb(223, 225, 230) 0px 0px 1px;
  border: 1px solid rgb(236, 237, 240);
  border-radius: 6px;
  padding: 4px;
}
</style>
