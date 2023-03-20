<script lang="ts" setup>
import type { BaseSlashMenuItem } from "@blocknote/core"

const props = defineProps<{
  menu: BaseSlashMenuItem
  selected: boolean
  onClick: Function
}>()
</script>

<template>
  <slot :name="'slashMenuItem-' + menu.name" :menu="menu" :selected="selected" :on-click="onClick">
    <div>
      <button @click="onClick()" :class="selected && 'selected'">{{ menu.name }}</button>
    </div>
  </slot>
</template>

<style style="postcss" scoped>
.selected {
  font-weight: bold;
}
</style>
