<script setup lang="ts">
import { useData } from "vitepress";
import { sponsors } from "../../../../data";
const { isDark } = useData();
</script>

<template>
  <div class="sponsors">
    <img
      v-for="company of sponsors"
      :src="isDark ? company.imgDark : company.imgLight"
      :alt="`${company.name} logo`"
    />
  </div>
</template>

<style lang="scss" scoped>
.sponsors {
  display: flex;
  justify-content: center;
  gap: 92px;
  width: 1000px;
  max-width: 100%;
  margin: 0 auto 92px;
  text-align: center;
  @media (max-width: 1024px) {
    flex-wrap: wrap;
    gap: 36px 64px;
    padding: 0 52px;
  }
  @media (max-width: 680px) {
    padding: 0 24px;
  }
}

img {
  height: 48px;
  max-width: 164px;
}
</style>
