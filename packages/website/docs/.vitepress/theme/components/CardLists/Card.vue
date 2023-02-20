<script>
export default {
 props: ['url']
}
</script>

<template>
  <a v-if="url" :href="url" class="card">
    <slot />
  </a>
  <div class="card" v-else>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-radius: 16px;
  box-shadow: 
    inset 0 0 0 1px rgba(196, 208, 217, 0.4),
    inset 0 -1px 0 0 rgba(255,255,255,0.1),
    inset 0 1px 0 0 rgba(132, 185, 246, 0.1);
  background-color: rgba(255,255,255,0.32);
  backdrop-filter: blur(6px);
  :root.dark & {
    box-shadow:
      inset 0 0 0 1px rgba(193, 228, 255, 0.1);
    background-color: rgba(185, 222, 255, 0.04);
    backdrop-filter: blur(6px);
  }
}
</style>