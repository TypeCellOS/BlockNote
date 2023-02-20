<template>
  <button type="button"><slot /></button>
</template>

<style scoped>
button {
  margin: 0 4px;
  padding: 4px 8px;
  border: solid 1px var(--vp-c-divider-light);
  border-radius: 4px;
  line-height: 1.2;
  font-size: inherit;
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
}
</style>
