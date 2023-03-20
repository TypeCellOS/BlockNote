<script lang="ts" setup>
import type { SlashMenuProps } from './slashMenuFactory'
import SlashMenuItem from './SlashMenuItem.vue'

const props = defineProps<{
  reactiveParams: SlashMenuProps
}>()
</script>

<template>
  <slot name="slashMenu">
    <SlashMenuItem v-for="(item, i) in reactiveParams.items" :key="item.name" :menu="item"
      :selected="reactiveParams.keyboardHoveredItemIndex === i" :on-click="reactiveParams.itemCallback" />
  </slot>
</template>

<style style="postcss">
.slash-menu {
  position: absolute;
  background: white;
  box-shadow: rgb(223, 225, 230) 0px 4px 8px, rgb(223, 225, 230) 0px 0px 1px;
  border: 1px solid rgb(236, 237, 240);
  border-radius: 6px;
  padding: 4px;
}
</style>
