<script setup lang="ts">
defineProps<{
  columns: number,
  noWrap?: boolean,
}>();
</script>

<template>
  <div :class="`card-list col-${columns} ${noWrap ? 'no-wrap' : ''}`">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.card-list {
  --columns: 3;
  --gap: 12px;
  --width: 1fr;
  display: grid;
  justify-content: center;
  grid-template-columns: repeat(var(--columns), var(--width));
  gap: var(--gap);
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 0 16px;
  @media (max-width: 500px) {
    padding: 0 12px;
  }
  &.col-2 {
    --columns: 2;
    --gap: 32px;
    --width: 540px;
  }
  &.col-3 {
    --columns: 3;
    @media (max-width: 1100px) {
      --columns: 2;
    }
    @media (max-width: 640px) {
      --columns: 1;
    }
  }
  &.col-4 {
    --columns: 4;
    @media (max-width: 1100px) {
      --columns: 2;
    }
    @media (max-width: 640px) {
      --columns: 1;
    }
  }

  &.no-wrap {
    display: flex;
    justify-content: flex-start;
    padding: 0;
  }
}
</style>