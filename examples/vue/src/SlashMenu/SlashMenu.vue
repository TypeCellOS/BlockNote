<script lang="ts" setup>
import type { SlashMenuProps } from './slashMenuFactory'
import type { BaseSlashMenuItem } from "@blocknote/core"
import SlashMenuItem from './SlashMenuItem.vue'

const props = defineProps<{
  reactiveParams: SlashMenuProps
}>()

function onClick(menu: BaseSlashMenuItem) {
  props.reactiveParams.itemCallback(menu)
}

function isSelected(i: number) {
  return props.reactiveParams.keyboardHoveredItemIndex === i
}

</script>

<template>
  <slot name="SlashMenu">
    <template v-for="(menu, i) in reactiveParams.items" :key="menu.name">
      <slot :name="'SlashMenuItem-' + menu.name" :menu="menu" :selected="isSelected(i)" :on-click="() => onClick(menu)">
        <SlashMenuItem :menu="menu" :selected="isSelected(i)" :on-click="() => onClick(menu)" />
      </slot>
    </template>
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
