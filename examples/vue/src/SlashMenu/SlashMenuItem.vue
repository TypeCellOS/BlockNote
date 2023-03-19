<script lang="ts" setup>
import type { BaseSlashMenuItem } from "@blocknote/core"

const props = defineProps<{
  menu: BaseSlashMenuItem
  selected: boolean
  onClick: Function
}>()
</script>

<template>
  <button @click="onClick()" :class="selected && 'selected'">{{ menu.name }}</button>
</template>

<style style="postcss" scoped>
.selected {
  font-weight: bold;
}
</style>
